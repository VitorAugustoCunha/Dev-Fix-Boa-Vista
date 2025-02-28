// mobile/screens/ProfileScreen.js
import React, { useContext, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  Switch 
} from 'react-native';
import { Avatar, Button, Card, ListItem, Icon } from 'react-native-elements';
import { useQuery, gql } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import AuthContext from '../contexts/AuthContext';

// Consulta para obter dados do usuário
const GET_USER = gql`
  query GetUserProfile {
    me {
      id
      name
      email
      isAuthority
      createdAt
      reportedProblems
      profilePicture
    }
  }
`;

// Consulta para obter problemas reportados pelo usuário
const GET_USER_PROBLEMS = gql`
  query GetUserProblems {
    problems {
      id
      title
      status
      category
      severity
      createdAt
    }
  }
`;

const ProfileScreen = ({ navigation }) => {
  const { signOut } = useContext(AuthContext);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Carregar dados do usuário
  const { loading: userLoading, error: userError, data: userData, refetch: refetchUser } = useQuery(GET_USER, {
    fetchPolicy: 'network-only',
    onError: (error) => {
      console.error('Erro ao carregar perfil:', error);
    }
  });

  // Carregar problemas do usuário
  const { loading: problemsLoading, error: problemsError, data: problemsData, refetch: refetchProblems} = useQuery(GET_USER_PROBLEMS);

    // Adicionar listener para atualizar dados quando a tela receber foco
  React.useEffect(() => {
      const unsubscribe = navigation.addListener('focus', () => {
        refetchUser();
        refetchProblems();
      });
  
      return unsubscribe;
  }, [navigation]);
  
  // Função para confirmar logout
  const confirmLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', onPress: () => signOut() }
      ]
    );
  };
  
  // Tradução de categorias
  const categoryTranslation = {
    TRAFFIC: 'Trânsito',
    INFRASTRUCTURE: 'Infraestrutura',
    SECURITY: 'Segurança',
    ENVIRONMENT: 'Meio Ambiente',
    PUBLIC_LIGHTING: 'Iluminação Pública',
    OTHERS: 'Outros',
  };
  
  // Tradução de status
  const statusTranslation = {
    REPORTED: 'Reportado',
    IN_REVIEW: 'Em Análise',
    IN_PROGRESS: 'Em Andamento',
    RESOLVED: 'Resolvido',
    CLOSED: 'Fechado',
  };
  
  // Cores para status
  const statusColors = {
    REPORTED: '#9E9E9E', // Cinza
    IN_REVIEW: '#2196F3', // Azul
    IN_PROGRESS: '#FFC107', // Amarelo
    RESOLVED: '#4CAF50', // Verde
    CLOSED: '#607D8B', // Azul Cinza
  };
  
  // Formatar data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };
  
  // Filtrar apenas os problemas reportados pelo usuário
  const userProblems = problemsData?.problems?.filter(problem => 
    userData?.me?.reportedProblems?.includes(problem.id)
  ) || [];
  
  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }
  
  if (userError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color="red" />
        <Text style={styles.errorText}>Erro ao carregar perfil:</Text>
        <Text>{userError.message}</Text>
      </View>
    );
  }
  
  const user = userData?.me;
  
  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Usuário não encontrado</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      {/* Cabeçalho do perfil */}
      <View style={styles.header}>
        <Avatar
          size="large"
          rounded
          title={user.name.charAt(0)}
          source={user.profilePicture ? { uri: user.profilePicture } : null}
          containerStyle={styles.avatar}
        />
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <Text style={styles.userMeta}>
          Membro desde {formatDate(user.createdAt)}
        </Text>
        {user.isAuthority && (
          <View style={styles.authorityBadge}>
            <Ionicons name="shield-checkmark" size={16} color="white" />
            <Text style={styles.authorityText}>Autoridade</Text>
          </View>
        )}
      </View>
      
      {/* Configurações */}
      <Card containerStyle={styles.card}>
        <Card.Title>Configurações</Card.Title>
        <Card.Divider />
        
        <ListItem bottomDivider>
          <ListItem.Content>
            <ListItem.Title>Notificações</ListItem.Title>
          </ListItem.Content>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={notificationsEnabled ? "#1E88E5" : "#f4f3f4"}
          />
        </ListItem>
        
        <ListItem bottomDivider onPress={() => console.log('Editar perfil')}>
          <Ionicons name="person" size={24} color="#666" />
          <ListItem.Content>
            <ListItem.Title>Editar Perfil</ListItem.Title>
          </ListItem.Content>
          <ListItem.Chevron />
        </ListItem>
        
        <ListItem bottomDivider onPress={() => console.log('Alterar senha')}>
          <Ionicons name="lock-closed" size={24} color="#666" />
          <ListItem.Content>
            <ListItem.Title>Alterar Senha</ListItem.Title>
          </ListItem.Content>
          <ListItem.Chevron />
        </ListItem>
        
        <ListItem onPress={() => console.log('Privacidade')}>
          <Ionicons name="shield" size={24} color="#666" />
          <ListItem.Content>
            <ListItem.Title>Privacidade</ListItem.Title>
          </ListItem.Content>
          <ListItem.Chevron />
        </ListItem>
      </Card>
      
      {/* Problemas reportados */}
      <Card containerStyle={styles.card}>
        <Card.Title>Meus Problemas Reportados</Card.Title>
        <Card.Divider />
        
        {problemsLoading ? (
          <ActivityIndicator size="small" color="#1E88E5" />
        ) : problemsError ? (
          <Text style={styles.errorText}>Erro ao carregar problemas</Text>
        ) : userProblems.length === 0 ? (
          <Text style={styles.emptyListText}>Você ainda não reportou nenhum problema.</Text>
        ) : (
          userProblems.map((problem, index) => (
            <ListItem 
              key={index} 
              bottomDivider={index < userProblems.length - 1}
              onPress={() => navigation.navigate('ProblemDetail', { problemId: problem.id })}
            >
              <Ionicons 
                name="alert-circle" 
                size={24} 
                color={statusColors[problem.status]} 
              />
              <ListItem.Content>
                <ListItem.Title>{problem.title}</ListItem.Title>
                <ListItem.Subtitle>
                  {categoryTranslation[problem.category]} • {statusTranslation[problem.status]}
                </ListItem.Subtitle>
              </ListItem.Content>
              <Text style={styles.problemDate}>{formatDate(problem.createdAt)}</Text>
              <ListItem.Chevron />
            </ListItem>
          ))
        )}
        
        <Button
          title="Ver Todos"
          type="clear"
          disabled={userProblems.length === 0}
          containerStyle={styles.viewAllButton}
        />
      </Card>
      
      {/* Sobre o aplicativo */}
      <Card containerStyle={styles.card}>
        <Card.Title>Sobre</Card.Title>
        <Card.Divider />
        
        <ListItem bottomDivider onPress={() => console.log('Sobre o aplicativo')}>
          <Ionicons name="information-circle" size={24} color="#666" />
          <ListItem.Content>
            <ListItem.Title>Sobre o Aplicativo</ListItem.Title>
          </ListItem.Content>
          <ListItem.Chevron />
        </ListItem>
        
        <ListItem bottomDivider onPress={() => console.log('Termos de uso')}>
          <Ionicons name="document-text" size={24} color="#666" />
          <ListItem.Content>
            <ListItem.Title>Termos de Uso</ListItem.Title>
          </ListItem.Content>
          <ListItem.Chevron />
        </ListItem>
        
        <ListItem onPress={() => console.log('Política de privacidade')}>
          <Ionicons name="shield-checkmark" size={24} color="#666" />
          <ListItem.Content>
            <ListItem.Title>Política de Privacidade</ListItem.Title>
          </ListItem.Content>
          <ListItem.Chevron />
        </ListItem>
      </Card>
      
      {/* Botão de logout */}
      <Button
        title="Sair"
        icon={<Ionicons name="log-out" size={20} color="white" style={styles.logoutIcon} />}
        buttonStyle={styles.logoutButton}
        containerStyle={styles.logoutButtonContainer}
        onPress={confirmLogout}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginVertical: 10,
  },
  header: {
    backgroundColor: '#1E88E5',
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  userEmail: {
    color: 'white',
    fontSize: 16,
    marginTop: 5,
  },
  userMeta: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 5,
  },
  authorityBadge: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  authorityText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  emptyListText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 15,
  },
  problemDate: {
    fontSize: 12,
    color: '#666',
  },
  viewAllButton: {
    marginTop: 10,
  },
  logoutButtonContainer: {
    marginHorizontal: 20,
    marginVertical: 20,
  },
  logoutButton: {
    backgroundColor: '#F44336',
    borderRadius: 25,
    height: 50,
  },
  logoutIcon: {
    marginRight: 10,
  },
});

export default ProfileScreen;