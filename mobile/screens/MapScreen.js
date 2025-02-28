import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import MapView, { Marker, Heatmap, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useQuery, gql } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { Button, Chip, Overlay } from 'react-native-elements';


// Consulta GraphQL para obter os problemas
const GET_PROBLEMS = gql`
  query GetProblems($category: Category, $severity: Severity) {
    problems(category: $category, severity: $severity) {
      id
      title
      description
      location {
        latitude
        longitude
      }
      severity
      category
      status
      upvotes
      createdAt
    }
  }
`;

// Consulta para dados do mapa de calor
const GET_HEATMAP_DATA = gql`
  query GetHeatmapData {
    heatmapData {
      id
      location {
        latitude
        longitude
      }
      severity
      category
    }
  }
`;

const severityColors = {
  LOW: '#4CAF50', // Verde
  MEDIUM: '#FFC107', // Amarelo
  HIGH: '#F44336', // Vermelho
};

const categoryIcons = {
  TRAFFIC: 'car',
  INFRASTRUCTURE: 'construct',
  SECURITY: 'shield',
  ENVIRONMENT: 'leaf',
  PUBLIC_LIGHTING: 'flashlight',
  OTHERS: 'help-circle',
};

const MapScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSeverity, setSelectedSeverity] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  
  // Consultas GraphQL
  const { loading, error, data, refetch } = useQuery(GET_PROBLEMS, {
    variables: { category: selectedCategory, severity: selectedSeverity },
    fetchPolicy: 'network-only',
  });
  
  const { data: heatmapData } = useQuery(GET_HEATMAP_DATA, {
    skip: !showHeatmap,
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
    })();
  }, []);
  
  // Processar pontos para o mapa de calor
  const getHeatmapPoints = () => {
    if (!heatmapData || !heatmapData.heatmapData) return [];
    
    return heatmapData.heatmapData.map(problem => ({
      latitude: problem.location.latitude,
      longitude: problem.location.longitude,
      weight: problem.severity === 'HIGH' ? 1.0 : 
              problem.severity === 'MEDIUM' ? 0.7 : 0.4,
    }));
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
    { label: 'Baixa', value: 'LOW' },
    { label: 'Média', value: 'MEDIUM' },
    { label: 'Alta', value: 'HIGH' },
  ];
  
  // Função para limpar os filtros
  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedSeverity(null);
    refetch({ category: null, severity: null });
    setFilterModalVisible(false);
  };
  
  // Função para aplicar os filtros
  const applyFilters = () => {
    refetch({ category: selectedCategory, severity: selectedSeverity });
    setFilterModalVisible(false);
  };
  
  // Renderizar o mapa
  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          {/* Renderizar marcadores */}
          {!loading && data && data.problems && data.problems.map(problem => (
            <Marker
              key={problem.id}
              coordinate={{
                latitude: problem.location.latitude,
                longitude: problem.location.longitude,
              }}
              pinColor={severityColors[problem.severity]}
              onPress={() => navigation.navigate('ProblemDetail', { problemId: problem.id })}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{problem.title}</Text>
                  <Text style={styles.calloutDescription}>{problem.description.substring(0, 50)}...</Text>
                  <Text style={styles.calloutInfo}>
                    <Ionicons name={categoryIcons[problem.category]} size={12} /> {problem.category.replace('_', ' ')}
                  </Text>
                  <Text style={styles.calloutInfo}>👍 {problem.upvotes}</Text>
                </View>
              </Callout>
            </Marker>
          ))}
          
          {/* Mapa de calor */}
          {showHeatmap && heatmapData && (
            <Heatmap
              points={getHeatmapPoints()}
              radius={20}
              opacity={0.7}
              gradient={{
                colors: ['#0000FF', '#00FF00', '#FF0000'],
                startPoints: [0.2, 0.5, 0.8],
                colorMapSize: 256,
              }}
            />
          )}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Carregando mapa...</Text>
          {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
        </View>
      )}
      
      {/* Botões de controle */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.controlButton, 
            showHeatmap && styles.activeButton
          ]}
          onPress={() => setShowHeatmap(!showHeatmap)}
        >
          <Ionicons name="flame" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => refetch()}
        >
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Modal de filtros */}
      <Overlay
        isVisible={filterModalVisible}
        onBackdropPress={() => setFilterModalVisible(false)}
        overlayStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Filtrar Problemas</Text>
        
        <Text style={styles.sectionTitle}>Categoria</Text>
        <View style={styles.chipContainer}>
          {categories.map((category) => (
            <Chip
              key={category.value}
              title={category.label}
              type={selectedCategory === category.value ? 'solid' : 'outline'}
              containerStyle={styles.chip}
              onPress={() => setSelectedCategory(
                selectedCategory === category.value ? null : category.value
              )}
            />
          ))}
        </View>
        
        <Text style={styles.sectionTitle}>Gravidade</Text>
        <View style={styles.chipContainer}>
          {severities.map((severity) => (
            <Chip
              key={severity.value}
              title={severity.label}
              type={selectedSeverity === severity.value ? 'solid' : 'outline'}
              containerStyle={styles.chip}
              onPress={() => setSelectedSeverity(
                selectedSeverity === severity.value ? null : severity.value
              )}
            />
          ))}
        </View>
        
        <View style={styles.modalButtons}>
          <Button
            title="Limpar"
            type="outline"
            onPress={clearFilters}
            containerStyle={styles.modalButton}
          />
          <Button
            title="Aplicar"
            onPress={applyFilters}
            containerStyle={styles.modalButton}
          />
        </View>
      </Overlay>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    marginTop: 10,
    color: 'red',
    fontSize: 14,
  },
  callout: {
    width: 200,
    padding: 10,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  calloutDescription: {
    fontSize: 14,
    marginBottom: 5,
  },
  calloutInfo: {
    fontSize: 12,
    color: '#666',
  },
  controls: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'column',
  },
  controlButton: {
    backgroundColor: '#1E88E5',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
  },
  activeButton: {
    backgroundColor: '#FF5722',
  },
  modalContainer: {
    width: '90%',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  chip: {
    margin: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    width: '45%',
  },
});

export default MapScreen;