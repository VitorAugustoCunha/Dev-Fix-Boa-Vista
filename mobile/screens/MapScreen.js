// mobile/screens/MapScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import MapView, { Marker, Heatmap, Callout, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useQuery, gql } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { Button, Chip, Overlay } from 'react-native-elements';
import { getDistance } from 'geolib';
import NearbyProblemsModal from '../components/NearbyProblemsModal';


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
      photos {
        url
        createdAt
      }
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
  LOW: '#FFD700',    // Amarelo
  MEDIUM: '#FF9800', // Laranja
  HIGH: '#F44336',   // Vermelho
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
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSeverity, setSelectedSeverity] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [showNearbyRadius, setShowNearbyRadius] = useState(true);
  const [hasNearbyProblems, setHasNearbyProblems] = useState(false);
  const [nearbyProblemsCount, setNearbyProblemsCount] = useState(0);
  const NEARBY_RADIUS = 300; // Raio em metros para ocorrências próximas
  const [isNearbyModalVisible, setIsNearbyModalVisible] = useState(false);

  // Consultas GraphQL
  const { loading, error, data, refetch } = useQuery(GET_PROBLEMS, {
    variables: { category: selectedCategory, severity: selectedSeverity },
    fetchPolicy: 'network-only',
    onError: (error) => {
      console.error("Erro na consulta de problemas:", error);
    }
  });
  
  const { loading: heatmapLoading, data: heatmapData } = useQuery(GET_HEATMAP_DATA, {
    skip: !showHeatmap,
    onError: (error) => {
      console.error("Erro na consulta de mapa de calor:", error);
      setShowHeatmap(false);
    }
  });
  
  // Obter localização atual do usuário
  useEffect(() => {
    let isMounted = true;
    
    const getLocationAsync = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) {
            setErrorMsg('Permissão para acessar a localização foi negada');
          }
          return;
        }
        
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        if (isMounted) {
          console.log('Localização obtida:', location.coords.latitude, location.coords.longitude);
          setLocation(location);
        }
      } catch (error) {
        console.error('Erro ao obter localização:', error);
        if (isMounted) {
          setErrorMsg('Erro ao obter sua localização. Verifique se o GPS está ativado.');
        }
      }
    };
    
    getLocationAsync();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Verificar se existem problemas próximos quando os dados mudam
  useEffect(() => {
    if (location && data && data.problems && data.problems.length > 0) {
      const currentPosition = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      try {
        // Filtrar problemas próximos
        const nearbyProblems = data.problems.filter(problem => {
          if (!problem.location || !problem.location.latitude || !problem.location.longitude) {
            return false;
          }
          
          try {
            const distance = getDistance(
              currentPosition,
              {
                latitude: problem.location.latitude,
                longitude: problem.location.longitude
              }
            );
            
            return distance <= NEARBY_RADIUS;
          } catch (err) {
            console.warn('Erro ao calcular distância para problema:', problem.id, err);
            return false;
          }
        });
        
        const hasNearby = nearbyProblems.length > 0;
        setHasNearbyProblems(hasNearby);
        setNearbyProblemsCount(nearbyProblems.length);
        
        console.log(`Encontrados ${nearbyProblems.length} problemas próximos`);
      } catch (err) {
        console.error('Erro ao verificar problemas próximos:', err);
      }
    }
  }, [location, data]);
  
  // Função para alternar a visibilidade do raio de proximidade
  const toggleNearbyRadius = () => {
    setShowNearbyRadius(prev => !prev);
  };
  
  // Função para alternar o mapa de calor
  const toggleHeatmap = () => {
    try {
      if (!showHeatmap && (!heatmapData || !heatmapData.heatmapData || heatmapData.heatmapData.length === 0)) {
        Alert.alert(
          "Mapa de Calor", 
          "Carregando dados para o mapa de calor...",
          [{ text: "OK" }]
        );
      }
      setShowHeatmap(prev => !prev);
    } catch (error) {
      console.error("Erro ao alternar mapa de calor:", error);
      setShowHeatmap(false);
    }
  };
  
  // Processar pontos para o mapa de calor
  const getHeatmapPoints = () => {
    if (!heatmapData || !heatmapData.heatmapData || heatmapData.heatmapData.length === 0) {
      return [];
    }
    
    return heatmapData.heatmapData
      .filter(problem => 
        problem.location && 
        problem.location.latitude && 
        problem.location.longitude &&
        !isNaN(problem.location.latitude) &&
        !isNaN(problem.location.longitude)
      )
      .map(problem => ({
        latitude: problem.location.latitude,
        longitude: problem.location.longitude,
        weight: problem.severity === 'HIGH' ? 1.0 : 
                problem.severity === 'MEDIUM' ? 0.7 : 0.4,
      }));
  };
  
  // Navegar para tela de problemas próximos
  const goToNearbyProblems = () => {
    if (hasNearbyProblems) {
      setIsNearbyModalVisible(true);
    } else {
      Alert.alert(
        "Sem Ocorrências Próximas",
        `Não há ocorrências dentro de ${NEARBY_RADIUS}m da sua localização.`,
        [{ text: "OK" }]
      );
    }
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
  
  // Função para agrupar marcadores (simulação de clustering)
// No MapScreen.js, modifique a função groupMarkers
const groupMarkers = (markers) => {
  if (!markers || markers.length === 0) return [];
  
  // Filtrar marcadores por proximidade quando o raio estiver ativo
  let filteredMarkers = markers;
  
  if (showNearbyRadius && location) {
    const currentPosition = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
    
    // Filtrar apenas marcadores dentro do raio
    filteredMarkers = markers.filter(marker => {
      if (!marker.location || !marker.location.latitude || !marker.location.longitude) {
        return false;
      }
      
      try {
        const distance = getDistance(
          currentPosition,
          {
            latitude: marker.location.latitude,
            longitude: marker.location.longitude
          }
        );
        
        return distance <= NEARBY_RADIUS;
      } catch (err) {
        return false;
      }
    });
  }
  
  // Se o raio não estiver ativo, mostrar todos os marcadores individualmente
  if (!showNearbyRadius) {
    return filteredMarkers.map(marker => {
      if (!marker.location || !marker.location.latitude || !marker.location.longitude) {
        return null;
      }
      
      return {
        id: marker.id,
        coordinate: {
          latitude: marker.location.latitude,
          longitude: marker.location.longitude
        },
        severity: marker.severity,
        isCluster: false,
        ...marker
      };
    }).filter(marker => marker !== null);
  }
  
  // Se o raio estiver ativo, agrupar marcadores (que já estão filtrados por distância)
  const groups = {};
  const groupRadius = 0.005; // Aproximadamente 500m
  
  filteredMarkers.forEach(marker => {
    if (!marker.location || !marker.location.latitude || !marker.location.longitude) {
      return;
    }
    
    // Arredondar as coordenadas para agrupar pontos próximos
    const lat = Math.round(marker.location.latitude / groupRadius) * groupRadius;
    const lng = Math.round(marker.location.longitude / groupRadius) * groupRadius;
    const key = `${lat},${lng}`;
    
    if (!groups[key]) {
      groups[key] = [];
    }
    
    groups[key].push(marker);
  });
  
  return Object.entries(groups).map(([key, items]) => {
    const [lat, lng] = key.split(',').map(Number);
    
    if (items.length === 1) {
      // Retornar marcador único
      return {
        id: items[0].id,
        coordinate: {
          latitude: items[0].location.latitude,
          longitude: items[0].location.longitude
        },
        severity: items[0].severity,
        isCluster: false,
        ...items[0]
      };
    } else {
      // Retornar cluster
      return {
        id: `cluster-${key}`,
        coordinate: { latitude: lat, longitude: lng },
        count: items.length,
        isCluster: true,
        markers: items
      };
    }
  });
};
  
  // Renderizar o mapa
  return (
    <View style={styles.container}>
      {location ? (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            showsUserLocation
            showsMyLocationButton
          >
            {/* Círculo de raio de proximidade */}
            {showNearbyRadius && (
              <Circle
                center={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                radius={NEARBY_RADIUS}
                fillColor="rgba(30, 136, 229, 0.15)"
                strokeColor="rgba(30, 136, 229, 0.5)"
                strokeWidth={2}
                zIndex={1}
              />
            )}
            
            {/* Renderizar marcadores com clustering simulado */}
            {!loading && data && data.problems && 
              groupMarkers(data.problems).map(item => (
                item.isCluster ? (
                  // Renderizar cluster
                  <Marker
                    key={item.id}
                    coordinate={item.coordinate}
                    onPress={() => {
                      // Zoom in quando clica em um cluster
                      mapRef.current?.animateToRegion({
                        latitude: item.coordinate.latitude,
                        longitude: item.coordinate.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      }, 500);
                    }}
                  >
                    <View style={styles.clusterMarker}>
                      <Text style={styles.clusterText}>{item.count}</Text>
                    </View>
                  </Marker>
                ) : (
                  // Renderizar marcador individual
                  <Marker
                    key={item.id}
                    coordinate={item.coordinate}
                    pinColor={severityColors[item.severity]}
                    onPress={() => navigation.navigate('ProblemDetail', { problemId: item.id })}
                  >
                    <Callout>
                      <View style={styles.callout}>
                        <Text style={styles.calloutTitle}>{item.title}</Text>
                        <Text style={styles.calloutDescription}>{item.description.substring(0, 50)}...</Text>
                        <Text style={styles.calloutInfo}>
                          <Ionicons name={categoryIcons[item.category]} size={12} /> {item.category.replace('_', ' ')}
                        </Text>
                        <Text style={styles.calloutInfo}>👍 {item.upvotes}</Text>
                      </View>
                    </Callout>
                  </Marker>
                )
              ))
            }
            
            {/* Mapa de calor - apenas renderiza se houver pontos */}
            {showHeatmap && getHeatmapPoints().length > 0 && (
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
              onPress={toggleHeatmap}
              disabled={heatmapLoading}
            >
              <Ionicons name="flame" size={24} color="white" />
              {heatmapLoading && (
                <ActivityIndicator 
                  size="small" 
                  color="white" 
                  style={styles.buttonLoader}
                />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => refetch()}
            >
              <Ionicons name="refresh" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.controlButton,
                showNearbyRadius && styles.activeRadiusButton
              ]}
              onPress={toggleNearbyRadius}
              activeOpacity={0.7}
            >
              <Ionicons name="radio" size={24} color="white" />
            </TouchableOpacity>
            
            {hasNearbyProblems && (
              <TouchableOpacity 
                style={[styles.controlButton, styles.nearbyButton]}
                onPress={goToNearbyProblems}
                activeOpacity={0.7}
              >
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{nearbyProblemsCount}</Text>
                </View>
                <Ionicons name="location" size={24} color="white" />
              </TouchableOpacity>
            )}
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
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Carregando mapa...</Text>
          {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
        </View>
      )}
      <NearbyProblemsModal
        visible={isNearbyModalVisible}
        onClose={() => setIsNearbyModalVisible(false)}
        problems={data?.problems || []}
        userLocation={location}
        radius={NEARBY_RADIUS}
        navigation={navigation}
      />
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
  activeRadiusButton: {
    backgroundColor: '#FFB300',
  },
  nearbyButton: {
    backgroundColor: '#4CAF50',
  },
  badgeContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonLoader: {
    position: 'absolute',
    right: -8,
    top: -8,
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
  clusterMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E88E5',
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default MapScreen;