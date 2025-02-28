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

    next();
  });
  

  // Middlewares
  app.use(cors({
    origin: '*',
    credentials: true
  }));  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
  }));
  app.use(morgan('dev'));

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
    playground: true
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