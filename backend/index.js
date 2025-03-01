import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import './firebase-config.js';

import typeDefs from './schema.js';
import resolvers from './resolvers.js';

async function startServer() {
  const app = express();

  app.use((req, res, next) => {
    console.log('Requisição recebida:', {
      method: req.method,
      path: req.path,
      headers: req.headers,
      body: req.body
    });
    next();
  });
  
  // Middlewares
  app.use(cors());
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
  }));
  app.use(morgan('dev'));
  app.use(express.json());

  // Verificar a existência da variável JWT_SECRET
  if (!process.env.JWT_SECRET) {
    console.error('ERRO: JWT_SECRET não definido nas variáveis de ambiente');
    process.exit(1);
  }

  // Configuração do Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      // Pega o token do header de autorização
      const token = req.headers.authorization || '';
      return { token };
    },
    // Habilita o playground em desenvolvimento
    introspection: true,
    playground: true,
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return error;
    }
  });

  // Inicia o Apollo Server
  await server.start();

  // Aplica o middleware do Apollo ao Express
  server.applyMiddleware({ 
    app,
    path: '/graphql',
    cors: false // já estamos usando o cors do express
  });

  const PORT = process.env.PORT || 4000;

  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer().catch(error => {
  console.error('Erro ao iniciar o servidor:', error);
}); 