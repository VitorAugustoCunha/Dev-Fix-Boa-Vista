// mobile/screens/LoginScreen.js
import React, { useState, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ImageBackground, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useMutation, gql } from '@apollo/client';
import { Input, Button, Icon } from 'react-native-elements';
import AuthContext from '../contexts/AuthContext';

// Mutation para login
const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        isAuthority
      }
    }
  }
`;

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useContext(AuthContext);
  
  // Mutation de login
  const [login, { loading, error }] = useMutation(LOGIN, {
    onCompleted: (data) => {
      signIn({ 
        token: data.login.token, 
        userId: data.login.user.id 
      });
    }
  });
  
  // Função para realizar login
  const handleLogin = () => {
    if (!email || !password) {
      alert('Por favor, preencha todos os campos');
      return;
    }
    console.log('Fazendo login...');
    login({ variables: { email, password } });
  };

  return (
    <ImageBackground
      source={require('../assets/splash-icon.png')}
      style={styles.background}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.contentContainer}>
            <View style={styles.logoContainer}>
              <Icon
                name="map-marker-alert"
                type="material-community"
                color="#FFFFFF"
                size={70}
              />
              <Text style={styles.title}>Cidade Alerta</Text>
              <Text style={styles.subtitle}>Reporte problemas urbanos em Boa Vista</Text>
            </View>
            
            <View style={styles.formContainer}>
              <Input
                placeholder="Email"
                leftIcon={{ type: 'material', name: 'email', color: '#666' }}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                containerStyle={styles.inputContainer}
                inputStyle={styles.input}
              />
              
              <Input
                placeholder="Senha"
                leftIcon={{ type: 'material', name: 'lock', color: '#666' }}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon
                      name={showPassword ? 'visibility-off' : 'visibility'}
                      type="material"
                      color="#666"
                    />
                  </TouchableOpacity>
                }
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                containerStyle={styles.inputContainer}
                inputStyle={styles.input}
              />
              
              {error && (
                <Text style={styles.errorText}>
                  {error.message.includes('Credenciais inválidas') 
                    ? 'Email ou senha incorretos' 
                    : 'Erro ao fazer login. Tente novamente.'
                  }
                </Text>
              )}
              
              <Button
                title="Entrar"
                buttonStyle={styles.loginButton}
                titleStyle={styles.loginButtonText}
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
              />
              
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Não tem uma conta?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.registerLink}>Cadastre-se</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 10,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 10,
  },
  input: {
    paddingLeft: 10,
    color: '#333',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#1E88E5',
    borderRadius: 25,
    height: 50,
    marginTop: 10,
  },
  loginButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#666',
    marginRight: 5,
  },
  registerLink: {
    color: '#1E88E5',
    fontWeight: 'bold',
  },
});

export default LoginScreen;