// mobile/contexts/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    isLoading: true,
    userToken: null,
    userId: null,
  });
  
  useEffect(() => {
    // Verificar se o usuário já está logado
    const bootstrapAsync = async () => {
      let userToken;
      let userId;
      
      try {
        userToken = await AsyncStorage.getItem('userToken');
        userId = await AsyncStorage.getItem('userId');
      } catch (e) {
        // Ignorar erros ao restaurar o token
      }
      
      setState({ isLoading: false, userToken, userId });
    };
    
    bootstrapAsync();
  }, []);

  const authContext = {
    signIn: async (data) => {
      try {
        // O token agora é JWT, não precisa de conversão
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userId', data.userId);
        setState({ ...state, userToken: data.token, userId: data.userId });
      } catch (e) {
        console.log('Erro ao salvar dados de autenticação', e);
      }
    },
    signOut: async () => {
      try {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userId');
        setState({ ...state, userToken: null, userId: null });
      } catch (e) {
        console.log('Erro ao remover dados de autenticação', e);
      }
    },
    signUp: async (data) => {
      try {
        // O mesmo processo do signIn
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userId', data.userId);
        setState({ ...state, userToken: data.token, userId: data.userId });
      } catch (e) {
        console.log('Erro ao salvar dados de autenticação', e);
      }
    },
  };

  return (
    <AuthContext.Provider value={{ ...state, ...authContext }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;