import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Button, ListItem } from 'react-native-elements';
import { Ionicons } from '@expo/vector-icons';
import { getDistance } from 'geolib';

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

const NearbyProblemsModal = ({ 
  visible, 
  onClose, 
  problems, 
  userLocation, 
  radius = 300,
  navigation 
}) => {
  const [nearbyProblems, setNearbyProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calcular problemas próximos quando dados ou localização mudam
  useEffect(() => {
    if (visible && problems && userLocation) {
      setLoading(true);
      
      const currentPosition = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude
      };

      try {
        // Filtrar problemas por distância
        const problemsWithDistance = problems
          .filter(problem => 
            problem?.location?.latitude && 
            problem?.location?.longitude
          )
          .map(problem => {
            try {
              const distance = getDistance(
                currentPosition,
                {
                  latitude: problem.location.latitude,
                  longitude: problem.location.longitude
                }
              );
              return { ...problem, distance };
            } catch (err) {
              return { ...problem, distance: Infinity };
            }
          })
          .filter(problem => problem.distance <= radius)
          .sort((a, b) => a.distance - b.distance);

        setNearbyProblems(problemsWithDistance);
      } catch (err) {
        console.error('Erro ao processar problemas próximos:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [visible, problems, userLocation, radius]);

  // Renderizar item da lista
  const renderItem = ({ item }) => (
    <ListItem
      bottomDivider
      onPress={() => {
        onClose();
        navigation.navigate('ProblemDetail', { problemId: item.id });
      }}
      containerStyle={styles.itemContainer}
    >
      <View style={[styles.severityIndicator, { backgroundColor: severityColors[item.severity] }]} />
      
      {/* Thumbnail da foto (se disponível) */}
      {item.photos && item.photos.length > 0 ? (
        <Image 
          source={{ uri: item.photos[0].url }} 
          style={styles.thumbnail}
          defaultSource={require('../assets/icon.png')}
        />
      ) : (
        <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
          <Ionicons name={categoryIcons[item.category]} size={24} color="#aaa" />
        </View>
      )}
      
      <ListItem.Content>
        <ListItem.Title style={styles.itemTitle}>{item.title}</ListItem.Title>
        <ListItem.Subtitle>
          <Text style={styles.distance}>
            {item.distance < 1000 
              ? `${Math.round(item.distance)}m` 
              : `${(item.distance / 1000).toFixed(1)}km`} de distância
          </Text>
          {" • "}
          <Ionicons name={categoryIcons[item.category]} size={12} /> 
          {item.category.replace('_', ' ')}
        </ListItem.Subtitle>
      </ListItem.Content>
      <ListItem.Chevron />
    </ListItem>
  );

  // Conteúdo quando a lista está vazia
  const renderEmpty = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="location-outline" size={60} color="#ccc" />
        <Text style={styles.emptyText}>
          Nenhuma ocorrência encontrada dentro de {radius}m da sua localização.
        </Text>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E88E5" />
        
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Ocorrências Próximas {nearbyProblems.length > 0 ? `(${nearbyProblems.length})` : ''}
          </Text>
          <Text style={styles.headerSubtitle}>
            Dentro de {radius}m da sua localização
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Conteúdo */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E88E5" />
            <Text style={styles.loadingText}>Buscando ocorrências próximas...</Text>
          </View>
        ) : (
          <FlatList
            data={nearbyProblems}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={
              nearbyProblems.length === 0 ? styles.emptyList : null
            }
          />
        )}
        
        {/* Botão fechar no rodapé */}
        <View style={styles.footer}>
          <Button
            title="Fechar"
            onPress={onClose}
            buttonStyle={styles.footerButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 15,
    backgroundColor: '#1E88E5',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 40, // Espaço para o botão fechar
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 15,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  itemContainer: {
    padding: 10,
  },
  itemTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  severityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
  },
  placeholderThumbnail: {
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distance: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 15,
    marginBottom: 20,
  },
  footer: {
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerButton: {
    backgroundColor: '#1E88E5',
  }
});

export default NearbyProblemsModal;