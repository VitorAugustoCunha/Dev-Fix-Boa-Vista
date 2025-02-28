// mobile/screens/RegisterScreen.js
import React, { useState, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity
} from 'react-native';
import { Input, Button, Icon } from 'react-native-elements';
import { useMutation, gql } from '@apollo/client';
import AuthContext from '../contexts/AuthContext';

// Mutation para registro
const REGISTER_USER = gql`
  mutation RegisterUser($name: String!, $email: String!, $password: String!) {
    registerUser(name: $name, email: $email, password: $password) {
      token
      user {
        id
        name
        email
      }
    }
  }
`;

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp } = useContext(AuthContext);
  
  // Mutation de registro
  const [registerUser, { loading, error }] = useMutation(REGISTER_USER, {
    onCompleted: (data) => {
      signUp({ 
        token: data.registerUser.token, 
        userId: data.registerUser.user.id 
      });
    }
  });
  
  // Validações
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  // Função para validar o formulário
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    };
    
    // Validar nome
    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
      isValid = false;
    }
    
    // Validar email
    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email inválido';
      isValid = false;
    }
    
    // Validar senha
    if (!password) {
      newErrors.password = 'Senha é obrigatória';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'A senha deve ter pelo menos 6 caracteres';
      isValid = false;
    }
    
    // Validar confirmação de senha
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  // Função para registrar
  const handleRegister = () => {
    if (validateForm()) {
      registerUser({ variables: { name, email, password } });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Cadastre-se para reportar problemas na cidade</Text>
          
          <Input
            placeholder="Nome Completo"
            leftIcon={{ type: 'material', name: 'person', color: '#666' }}
            value={name}
            onChangeText={setName}
            errorMessage={errors.name}
            containerStyle={styles.inputContainer}
          />
          
          <Input
            placeholder="Email"
            leftIcon={{ type: 'material', name: 'email', color: '#666' }}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            errorMessage={errors.email}
            containerStyle={styles.inputContainer}
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
            errorMessage={errors.password}
            containerStyle={styles.inputContainer}
          />
          
          <Input
            placeholder="Confirmar Senha"
            leftIcon={{ type: 'material', name: 'lock', color: '#666' }}
            rightIcon={
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Icon
                  name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                  type="material"
                  color="#666"
                />
              </TouchableOpacity>
            }
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            errorMessage={errors.confirmPassword}
            containerStyle={styles.inputContainer}
          />
          
          {error && (
            <Text style={styles.errorText}>
              {error.message.includes('Error: Email already exists') 
                ? 'Este email já está cadastrado' 
                : 'Erro ao criar conta. Tente novamente.'
              }
            </Text>
          )}
          
          <Button
            title="Cadastrar"
            buttonStyle={styles.registerButton}
            titleStyle={styles.registerButtonText}
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
          />
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Já tem uma conta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 5,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  registerButton: {
    backgroundColor: '#1E88E5',
    borderRadius: 25,
    height: 50,
    marginTop: 10,
  },
  registerButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#666',
    marginRight: 5,
  },
  loginLink: {
    color: '#1E88E5',
    fontWeight: 'bold',
  },
});

export default RegisterScreen;