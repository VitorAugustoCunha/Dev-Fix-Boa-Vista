// mobile/screens/ReportProblemScreen.js
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Alert,
  Platform
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Input, Button, Divider, Chip } from 'react-native-elements';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, gql } from '@apollo/client';

// Mutation para reportar problema
const REPORT_PROBLEM = gql`
  mutation ReportProblem($problem: ProblemInput!) {
    reportProblem(problem: $problem) {
      id
      title
      description
    }
  }
`;

const ReportProblemScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [photos, setPhotos] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(null);
  
  // Mutation para reportar problema
  const [reportProblem, { loading }] = useMutation(REPORT_PROBLEM, {
    onCompleted: () => {
      Alert.alert(
        'Sucesso', 
        'Problema reportado com sucesso!',
        [{ text: 'OK', onPress: () => navigation.navigate('Map') }]
      );
    },
    onError: (error) => {
      Alert.alert('Erro', error.message || 'Erro ao reportar problema. Tente novamente.');
    }
  });
  
  // Obter localização atual do usuário
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão para acessar a localização foi negada');
        return;
      }
      
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      setMarkerPosition({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
    
    // Solicitar permissão para acessar a galeria
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Desculpe, precisamos de permissão para acessar suas fotos!');
        }
      }
    })();
    
    // Solicitar permissão para acessar a câmera
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          alert('Desculpe, precisamos de permissão para acessar sua câmera!');
        }
      }
    })();
  }, []);
  
  // Função para escolher imagem da galeria
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newPhotos = [...photos, result.assets[0].uri];
      setPhotos(newPhotos);
    }
  };
  
  // Função para tirar foto com a câmera
  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newPhotos = [...photos, result.assets[0].uri];
      setPhotos(newPhotos);
    }
  };
  
  // Função para remover foto
  const removePhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };
  
  // Função para atualizar a posição do marcador
  const updateMarkerPosition = (event) => {
    setMarkerPosition(event.nativeEvent.coordinate);
  };
  
  // Categorias disponíveis
  const categories = [
    { label: 'Trânsito', value: 'TRAFFIC' },
    { label: 'Infraestrutura', value: 'INFRASTRUCTURE' },
    { label: 'Segurança', value: 'SECURITY' },
    { label: 'Meio Ambiente', value: 'ENVIRONMENT' },
    { label: 'Iluminação', value: 'PUBLIC_LIGHTING' },
    { label: 'Outros', value: 'OTHERS' },
  ];
  
  // Níveis de gravidade
  const severities = [
    { label: 'Baixa', value: 'LOW', color: '#4CAF50' },
    { label: 'Média', value: 'MEDIUM', color: '#FFC107' },
    { label: 'Alta', value: 'HIGH', color: '#F44336' },
  ];
  
  // Função para validar o formulário
  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, informe um título para o problema');
      return false;
    }
    
    if (!description.trim()) {
      Alert.alert('Erro', 'Por favor, descreva o problema');
      return false;
    }
    
    if (!category) {
      Alert.alert('Erro', 'Por favor, selecione uma categoria');
      return false;
    }
    
    if (!severity) {
      Alert.alert('Erro', 'Por favor, selecione um nível de gravidade');
      return false;
    }
    
    if (!markerPosition) {
      Alert.alert('Erro', 'Por favor, selecione a localização do problema no mapa');
      return false;
    }
    
    return true;
  };
  
  // Função para enviar relatório de problema
  const handleSubmit = () => {
    if (!validateForm()) return;
    
    const photosBase64 = photos.map(photo => {
      // Em uma implementação real, converteríamos cada foto para base64
      // Aqui apenas simulamos isso para o exemplo
      return `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/...`;
    });
    
    const problemData = {
      title,
      description,
      location: {
        latitude: markerPosition.latitude,
        longitude: markerPosition.longitude,
      },
      category,
      severity,
      photos: photosBase64,
    };
    
    reportProblem({ variables: { problem: problemData } });
  };
  
  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Carregando localização...</Text>
        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.mapContainer}>
        <Text style={styles.sectionTitle}>Localização do Problema</Text>
        <Text style={styles.sectionSubtitle}>Toque no mapa para marcar o local exato</Text>
        
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          onPress={updateMarkerPosition}
        >
          {markerPosition && (
            <Marker
              coordinate={markerPosition}
              draggable
              onDragEnd={updateMarkerPosition}
            />
          )}
        </MapView>
      </View>
      
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Detalhes do Problema</Text>
        
        <Input
          placeholder="Título do problema"
          value={title}
          onChangeText={setTitle}
          leftIcon={{ type: 'material', name: 'title', color: '#666' }}
          maxLength={100}
        />
        
        <Input
          placeholder="Descreva o problema detalhadamente"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          leftIcon={{ type: 'material', name: 'description', color: '#666' }}
          inputContainerStyle={styles.textAreaContainer}
          inputStyle={styles.textArea}
        />
        
        <Text style={styles.sectionSubtitle}>Categoria</Text>
        <View style={styles.chipContainer}>
          {categories.map((item) => (
            <Chip
              key={item.value}
              title={item.label}
              type={category === item.value ? 'solid' : 'outline'}
              containerStyle={styles.chip}
              onPress={() => setCategory(item.value)}
            />
          ))}
        </View>
        
        <Text style={styles.sectionSubtitle}>Gravidade</Text>
        <View style={styles.chipContainer}>
          {severities.map((item) => (
            <Chip
              key={item.value}
              title={item.label}
              type={severity === item.value ? 'solid' : 'outline'}
              containerStyle={styles.chip}
              buttonStyle={severity === item.value ? { backgroundColor: item.color } : {}}
              onPress={() => setSeverity(item.value)}
            />
          ))}
        </View>
        
        <Divider style={styles.divider} />
        
        <Text style={styles.sectionTitle}>Fotos</Text>
      <Text style={styles.sectionSubtitle}>Adicione fotos para mostrar o problema</Text>

      <View style={styles.photoButtons}>
        <Button
          title="Galeria"
          icon={<Ionicons name="images" size={20} color="white" style={styles.buttonIcon} />}
          buttonStyle={styles.photoButton}
          containerStyle={styles.photoButtonContainer}
          onPress={pickImage}
        />
        <Button
          title="Câmera"
          icon={<Ionicons name="camera" size={20} color="white" style={styles.buttonIcon} />}
          buttonStyle={styles.photoButton}
          containerStyle={styles.photoButtonContainer}
          onPress={takePhoto}
        />
      </View>
        
        {photos.length > 0 && (
          <View style={styles.photoContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="red" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        
        <Button
          title="Enviar Relatório"
          containerStyle={styles.submitButtonContainer}
          buttonStyle={styles.submitButton}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
        />
      </View>
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
  },
  errorText: {
    color: 'red',
    marginTop: 10,
  },
  mapContainer: {
    padding: 15,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  map: {
    height: 200,
    borderRadius: 10,
    marginTop: 5,
  },
  formContainer: {
    padding: 15,
    backgroundColor: 'white',
  },
  textAreaContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 5,
  },
  textArea: {
    textAlignVertical: 'top',
    height: 100,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  chip: {
    margin: 5,
  },
  divider: {
    marginVertical: 15,
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  photoButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 10,
  },
  buttonIcon: {
    marginRight: 10,
  },
  photoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  photoWrapper: {
    position: 'relative',
    margin: 5,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 5,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  submitButtonContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  photoButtonContainer: {
    width: '48%', // Um pouco menos da metade para dar espaço entre eles
  },
  submitButton: {
    backgroundColor: '#1E88E5',
    borderRadius: 25,
    height: 50,
  },
});

export default ReportProblemScreen;