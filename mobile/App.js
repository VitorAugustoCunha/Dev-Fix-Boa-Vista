import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Importar telas
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import MapScreen from './screens/MapScreen';
import ReportProblemScreen from './screens/ReportProblemScreen';
import ProblemDetailScreen from './screens/ProblemDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import AuthContext from './contexts/AuthContext';
import { Platform } from 'react-native';
import { 
  API_URL_DEV, 
  API_URL_ANDROID, 
  API_URL_IOS, 
  API_URL_PROD 
} from '@env';

// Determine a URL do GraphQL baseada na plataforma e ambiente
const getGraphQLUrl = () => {
  if (__DEV__) {
    // Ambiente de desenvolvimento
    if (Platform.OS === 'android') {
      return API_URL_ANDROID;
    } else {
      return API_URL_IOS;
    }
  } else {
    // Ambiente de produção
    return API_URL_PROD;
  }
};

console.log('URL do GraphQL:', getGraphQLUrl());  

const httpLink = createHttpLink({
  uri: getGraphQLUrl(),
});

// Auth link para adicionar o token em cada requisição
const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem('userToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Cliente Apollo
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator
function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Report') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1E88E5',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ title: 'Mapa' }} 
      />
      <Tab.Screen 
        name="Report" 
        component={ReportProblemScreen} 
        options={{ title: 'Reportar' }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Perfil' }} 
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: 'Notificações' }} 
      />
    </Tab.Navigator>
  );
}

export default function App() {
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

// Substitua o authContext por esta versão corrigida
const authContext = {
  signIn: async (data) => {
    try {
      // Agora o token já é um JWT ou ID token do Firebase
      // Não precisamos mais trocar tokens
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userId', data.userId);
      setState({ ...state, userToken: data.token, userId: data.userId });
    } catch (e) {
      console.error('Erro ao salvar dados de autenticação', e);
    }
  },
  signOut: async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userId');
      setState({ ...state, userToken: null, userId: null });
    } catch (e) {
      console.error('Erro ao remover dados de autenticação', e);
    }
  },
  signUp: async (data) => {
    try {
      // Mesmo processo do signIn
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userId', data.userId);
      setState({ ...state, userToken: data.token, userId: data.userId });
    } catch (e) {
      console.error('Erro ao salvar dados de autenticação', e);
    }
  },
};

  if (state.isLoading) {
    return null; // Ou um componente de loading
  }

  return (
    <ApolloProvider client={client}>
      <AuthContext.Provider value={authContext}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            
            <Stack.Navigator>
              {state.userToken == null ? (
                // Telas de autenticação
                <>
                  <Stack.Screen 
                    name="Login" 
                    component={LoginScreen} 
                    options={{ headerShown: false }} 
                  />
                  <Stack.Screen 
                    name="Register" 
                    component={RegisterScreen} 
                    options={{ title: 'Criar Conta' }} 
                  />
                </>
              ) : (
                // Telas da aplicação
                <>
                  <Stack.Screen 
                    name="Home" 
                    component={HomeTabs} 
                    options={{ headerShown: false }} 
                  />
                  <Stack.Screen 
                    name="ProblemDetail" 
                    component={ProblemDetailScreen} 
                    options={{ title: 'Detalhes do Problema' }} 
                  />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </AuthContext.Provider>
    </ApolloProvider>
  );
}