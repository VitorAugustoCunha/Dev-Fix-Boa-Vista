import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import admin from 'firebase-admin';
const db = admin.firestore();

// Função para gerar token JWT
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      isAuthority: user.isAuthority 
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Função para verificar autenticação
const verifyAuth = async (context) => {
  const authHeader = context.token;
  if (!authHeader) {
    throw new AuthenticationError('Token de autenticação não fornecido');
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch (err) {
    console.error('Erro ao verificar token:', err);
    throw new AuthenticationError('Token inválido ou expirado');
  }
};

// Função para calcular distância entre dois pontos geográficos (km)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const resolvers = {
  Query: {
    problem: async (_, { id }) => {
      const problemDoc = await db.collection('problems').doc(id).get();
      if (!problemDoc.exists) {
        throw new Error('Problema não encontrado');
      }
      return { id: problemDoc.id, ...problemDoc.data() };
    },
    
    problems: async (_, { category, severity, status, nearLocation, radius = 5 }) => {
      let query = db.collection('problems');
      
      if (category) query = query.where('category', '==', category);
      if (severity) query = query.where('severity', '==', severity);
      if (status) query = query.where('status', '==', status);
      
      const snapshot = await query.get();
      let problems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filtrar por localização se necessário
      if (nearLocation) {
        problems = problems.filter(problem => {
          const distance = calculateDistance(
            nearLocation.latitude, nearLocation.longitude,
            problem.location.latitude, problem.location.longitude
          );
          return distance <= radius;
        });
      }
      
      return problems;
    },
    
    user: async (_, { id }, context) => {
      await verifyAuth(context);
      const userDoc = await db.collection('users').doc(id).get();
      if (!userDoc.exists) {
        throw new Error('Usuário não encontrado');
      }
      const userData = userDoc.data();
      delete userData.password; // Não retornar a senha
      return { id: userDoc.id, ...userData };
    },
    
    me: async (_, __, context) => {
      const uid = await verifyAuth(context);
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        throw new Error('Usuário não encontrado');
      }
      const userData = userDoc.data();
      delete userData.password; // Não retornar a senha
      return { id: userDoc.id, ...userData };
    },
    
    dashboard: async (_, __, context) => {
      const uid = await verifyAuth(context);
      
      // Verificar se o usuário é uma autoridade
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists || !userDoc.data().isAuthority) {
        throw new ForbiddenError('Acesso negado. Apenas autoridades podem acessar o dashboard');
      }
      
      // Buscar dados para o dashboard
      const problemsSnapshot = await db.collection('problems').get();
      const problems = problemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Calcular métricas
      const totalProblems = problems.length;
      const resolvedProblems = problems.filter(p => p.status === 'RESOLVED' || p.status === 'CLOSED').length;
      const pendingProblems = totalProblems - resolvedProblems;
      
      // Problemas por categoria
      const categories = ['TRAFFIC', 'INFRASTRUCTURE', 'SECURITY', 'ENVIRONMENT', 'PUBLIC_LIGHTING', 'OTHERS'];
      const problemsByCategory = categories.map(category => ({
        category,
        count: problems.filter(p => p.category === category).length
      }));
      
      // Problemas por severidade
      const severities = ['LOW', 'MEDIUM', 'HIGH'];
      const problemsBySeverity = severities.map(severity => ({
        severity,
        count: problems.filter(p => p.severity === severity).length
      }));
      
      // Problemas recentes
      const recentProblems = problems
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
      
      return {
        totalProblems,
        resolvedProblems,
        pendingProblems,
        problemsByCategory,
        problemsBySeverity,
        recentProblems
      };
    },
    
    heatmapData: async () => {
      const snapshot = await db.collection('problems').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  },
  
  Mutation: {
    register: async (_, { name, email, password }) => {
      try {
        // Validação de dados
        if (!name || !email || !password) {
          throw new UserInputError('Todos os campos são obrigatórios');
        }
        
        if (password.length < 6) {
          throw new UserInputError('A senha deve ter pelo menos 6 caracteres');
        }
        
        // Verificar se o email já está em uso
        const emailCheck = await db.collection('users')
          .where('email', '==', email)
          .get();
          
        if (!emailCheck.empty) {
          throw new UserInputError('Este email já está em uso');
        }
        
        // Criptografar a senha
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Criar novo documento de usuário
        const newUser = {
          name,
          email,
          password: hashedPassword,
          isAuthority: false,
          createdAt: new Date().toISOString(),
          reportedProblems: []
        };
        
        // Salvar no Firestore
        const userRef = await db.collection('users').add(newUser);
        
        // Objeto de usuário sem a senha para retornar
        const user = {
          id: userRef.id,
          name,
          email,
          isAuthority: false,
          createdAt: new Date().toISOString(),
          reportedProblems: []
        };
        
        // Gerar token JWT
        const token = generateToken({...user, id: userRef.id});
        
        return { token, user };
      } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        throw error;
      }
    },
    
    login: async (_, { email, password }) => {
      try {
        // Buscar usuário pelo email
        const usersRef = await db.collection('users')
          .where('email', '==', email)
          .limit(1)
          .get();
          
        if (usersRef.empty) {
          throw new AuthenticationError('Credenciais inválidas');
        }
        
        const userDoc = usersRef.docs[0];
        const userData = userDoc.data();
        
        // Verificar a senha
        const isPasswordValid = await bcrypt.compare(password, userData.password);
        
        if (!isPasswordValid) {
          throw new AuthenticationError('Credenciais inválidas');
        }
        
        // Remover a senha do objeto de usuário
        const user = {
          id: userDoc.id,
          name: userData.name,
          email: userData.email,
          isAuthority: userData.isAuthority,
          profilePicture: userData.profilePicture,
          createdAt: userData.createdAt,
          reportedProblems: userData.reportedProblems || []
        };
        
        // Gerar token JWT
        const token = generateToken({...user, id: userDoc.id});
        
        return { token, user };
      } catch (error) {
        console.error('Erro ao fazer login:', error);
        throw error;
      }
    },
    
    reportProblem: async (_, { problem }, context) => {
      const uid = await verifyAuth(context);
      
      // Buscar informações do usuário
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        throw new Error('Usuário não encontrado');
      }
      
      const userName = userDoc.data().name;
      
      // Criar o problema no Firestore
      const problemData = {
        ...problem,
        status: 'REPORTED',
        reportedBy: uid,
        reporterName: userName,
        upvotes: 0,
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const problemRef = await db.collection('problems').add(problemData);
      
      // Atualizar a lista de problemas reportados pelo usuário
      const reportedProblems = userDoc.data().reportedProblems || [];
      await db.collection('users').doc(uid).update({
        reportedProblems: [...reportedProblems, problemRef.id]
      });
      
      return {
        id: problemRef.id,
        ...problemData
      };
    },
    
    updateProblemStatus: async (_, { id, status }, context) => {
      const uid = await verifyAuth(context);
      
      // Verificar se o usuário é uma autoridade
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists || !userDoc.data().isAuthority) {
        throw new ForbiddenError('Apenas autoridades podem atualizar o status de problemas');
      }
      
      // Atualizar o status do problema
      await db.collection('problems').doc(id).update({
        status,
        updatedAt: new Date().toISOString()
      });
      
      // Retornar o problema atualizado
      const updatedProblemDoc = await db.collection('problems').doc(id).get();
      return {
        id: updatedProblemDoc.id,
        ...updatedProblemDoc.data()
      };
    },
    
    assignProblem: async (_, { id, assignedTo }, context) => {
      const uid = await verifyAuth(context);
      
      // Verificar se o usuário é uma autoridade
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists || !userDoc.data().isAuthority) {
        throw new ForbiddenError('Apenas autoridades podem atribuir problemas');
      }
      
      // Verificar se o usuário atribuído existe e é uma autoridade
      const assignedUserDoc = await db.collection('users').doc(assignedTo).get();
      if (!assignedUserDoc.exists || !assignedUserDoc.data().isAuthority) {
        throw new Error('O usuário atribuído deve ser uma autoridade');
      }
      
      // Atualizar o problema
      await db.collection('problems').doc(id).update({
        assignedTo,
        updatedAt: new Date().toISOString()
      });
      
      // Retornar o problema atualizado
      const updatedProblemDoc = await db.collection('problems').doc(id).get();
      return {
        id: updatedProblemDoc.id,
        ...updatedProblemDoc.data()
      };
    },
    
    addComment: async (_, { comment }, context) => {
      const uid = await verifyAuth(context);
      
      // Buscar informações do usuário
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        throw new Error('Usuário não encontrado');
      }
      
      const userName = userDoc.data().name;
      const isOfficial = userDoc.data().isAuthority;
      
      // Criar o comentário
      const newComment = {
        id: `comment_${Date.now()}`,
        text: comment.text,
        userId: uid,
        userName,
        isOfficial,
        createdAt: new Date().toISOString()
      };
      
      // Buscar o problema
      const problemDoc = await db.collection('problems').doc(comment.problemId).get();
      if (!problemDoc.exists) {
        throw new Error('Problema não encontrado');
      }
      
      const problemData = problemDoc.data();
      const comments = problemData.comments || [];
      
      // Atualizar o problema com o novo comentário
      await db.collection('problems').doc(comment.problemId).update({
        comments: [...comments, newComment],
        updatedAt: new Date().toISOString()
      });
      
      return newComment;
    },
    
    uploadPhoto: async (_, { problemId, photoBase64 }, context) => {
      const uid = await verifyAuth(context);
      
      // Verificar se o problema existe
      const problemDoc = await db.collection('problems').doc(problemId).get();
      if (!problemDoc.exists) {
        throw new Error('Problema não encontrado');
      }
      
      // Verificar se o usuário é o criador do problema ou uma autoridade
      const problemData = problemDoc.data();
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (problemData.reportedBy !== uid && !userDoc.data().isAuthority) {
        throw new ForbiddenError('Você não tem permissão para adicionar fotos a este problema');
      }
      
      // Em produção, aqui faria o upload da imagem para o Firebase Storage
      // e usaria a URL retornada. Para este exemplo, vamos simular isso.
      const photoUrl = `https://firebasestorage.googleapis.com/v0/b/cidade-alerta.appspot.com/o/photos%2F${problemId}_${Date.now()}.jpg`;
      
      const photo = {
        url: photoUrl,
        createdAt: new Date().toISOString()
      };
      
      // Atualizar o problema com a nova foto
      const photos = problemData.photos || [];
      await db.collection('problems').doc(problemId).update({
        photos: [...photos, photo],
        updatedAt: new Date().toISOString()
      });
      
      return photo;
    },
    
    upvoteProblem: async (_, { id }, context) => {
      const uid = await verifyAuth(context);
      
      // Incrementar o contador de upvotes
      const problemRef = db.collection('problems').doc(id);
      await db.runTransaction(async (transaction) => {
        const problemDoc = await transaction.get(problemRef);
        if (!problemDoc.exists) {
          throw new Error('Problema não encontrado');
        }
        
        const newUpvotes = (problemDoc.data().upvotes || 0) + 1;
        transaction.update(problemRef, { upvotes: newUpvotes });
      });
      
      // Retornar o problema atualizado
      const updatedProblemDoc = await problemRef.get();
      return {
        id: updatedProblemDoc.id,
        ...updatedProblemDoc.data()
      };
    }
  }
};

export default resolvers;