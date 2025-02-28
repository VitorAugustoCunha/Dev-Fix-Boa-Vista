// mobile/screens/ProblemDetailScreen.js
import React, { useContext, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { Button, Divider, Card, Input, Avatar, Chip } from 'react-native-elements';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, gql } from '@apollo/client';
import MapView, { Marker } from 'react-native-maps';
import AuthContext from '../contexts/AuthContext';



// Consulta para obter detalhes do problema
const GET_PROBLEM_DETAILS = gql`
  query GetProblemDetails($id: ID!) {
    problem(id: $id) {
      id
      title
      description
      category
      severity
      status
      location {
        latitude
        longitude
        address
      }
      photos
      upvotes
      comments {
        id
        text
        userName
        isOfficial
        createdAt
      }
      reporterName
      createdAt
      updatedAt
    }
  }
`;

// Mutation para votar em um problema
const UPVOTE_PROBLEM = gql`
  mutation UpvoteProblem($id: ID!) {
    upvoteProblem(id: $id) {
      id
      upvotes
    }
  }
`;

// Mutation para adicionar comentário
const ADD_COMMENT = gql`
  mutation AddComment($comment: CommentInput!) {
    addComment(comment: $comment) {
      id
      text
      userName
      isOfficial
      createdAt
    }
  }
`;

const ProblemDetailScreen = ({ route, navigation }) => {
  const { problemId } = route.params;
  const [commentText, setCommentText] = useState('');
  const { userId } = useContext(AuthContext);
  
  // Consulta para obter detalhes do problema
  const { loading, error, data, refetch } = useQuery(GET_PROBLEM_DETAILS, {
    variables: { id: problemId },
    fetchPolicy: 'network-only',
  });
  
  // Mutation para votar
  const [upvoteProblem] = useMutation(UPVOTE_PROBLEM, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      Alert.alert('Erro', error.message || 'Não foi possível votar no problema');
    }
  });
  
  // Mutation para adicionar comentário
  const [addComment, { loading: commentLoading }] = useMutation(ADD_COMMENT, {
    onCompleted: () => {
      setCommentText('');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Erro', error.message || 'Não foi possível adicionar comentário');
    }
  });
  
  // Função para enviar voto
  const handleUpvote = () => {
    upvoteProblem({ variables: { id: problemId } });
  };
  
  // Função para enviar comentário
  const handleComment = () => {
    if (!commentText.trim()) {
      Alert.alert('Aviso', 'Digite um comentário antes de enviar');
      return;
    }
    
    addComment({
      variables: {
        comment: {
          problemId,
          text: commentText.trim()
        }
      }
    });
  };
  
  // Formatação de data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Cores de acordo com a gravidade
  const severityColors = {
    LOW: '#4CAF50',
    MEDIUM: '#FFC107',
    HIGH: '#F44336',
  };
  
  // Tradução de categorias
  const categoryTranslation = {
    TRAFFIC: 'Trânsito',
    INFRASTRUCTURE: 'Infraestrutura',
    SECURITY: 'Segurança',
    ENVIRONMENT: 'Meio Ambiente',
    PUBLIC_LIGHTING: 'Iluminação Pública',
    OTHERS: 'Outros',
  };
  
  // Tradução de status
  const statusTranslation = {
    REPORTED: 'Reportado',
    IN_REVIEW: 'Em Análise',
    IN_PROGRESS: 'Em Andamento',
    RESOLVED: 'Resolvido',
    CLOSED: 'Fechado',
  };
  
  // Ícones para categorias
  const categoryIcons = {
    TRAFFIC: 'car',
    INFRASTRUCTURE: 'construct',
    SECURITY: 'shield',
    ENVIRONMENT: 'leaf',
    PUBLIC_LIGHTING: 'flashlight',
    OTHERS: 'help-circle',
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Carregando detalhes...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color="red" />
        <Text style={styles.errorText}>Erro ao carregar detalhes:</Text>
        <Text>{error.message}</Text>
        <Button 
          title="Tentar novamente" 
          onPress={() => refetch()} 
          containerStyle={styles.retryButton}
        />
      </View>
    );
  }
  
  const problem = data?.problem;
  
  if (!problem) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Problema não encontrado</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.title}>{problem.title}</Text>
        <View style={styles.metaContainer}>
          <Chip
            title={categoryTranslation[problem.category]}
            icon={
              <Ionicons 
                name={categoryIcons[problem.category]} 
                size={16} 
                color="white" 
                style={styles.chipIcon} 
              />
            }
            buttonStyle={{ backgroundColor: '#1E88E5' }}
            containerStyle={styles.chip}
          />
          <Chip
            title={statusTranslation[problem.status]}
            containerStyle={styles.chip}
          />
          <Chip
            title={'Gravidade: ' + problem.severity.charAt(0) + problem.severity.slice(1).toLowerCase()}
            buttonStyle={{ backgroundColor: severityColors[problem.severity] }}
            containerStyle={styles.chip}
          />
        </View>
      </View>
      
      {/* Mapa */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: problem.location.latitude,
            longitude: problem.location.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker
            coordinate={{
              latitude: problem.location.latitude,
              longitude: problem.location.longitude,
            }}
            pinColor={severityColors[problem.severity]}
          />
        </MapView>
        <TouchableOpacity style={styles.expandMapButton}>
          <Ionicons name="expand" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Detalhes */}
      <Card containerStyle={styles.detailsCard}>
        <Card.Title>Detalhes do Problema</Card.Title>
        <Card.Divider />
        
        <Text style={styles.description}>{problem.description}</Text>
        
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>
            <Ionicons name="person" size={16} /> Reportado por: {problem.reporterName}
          </Text>
          <Text style={styles.metaText}>
            <Ionicons name="calendar" size={16} /> Data: {formatDate(problem.createdAt)}
          </Text>
          <Text style={styles.metaText}>
            <Ionicons name="time" size={16} /> Última atualização: {formatDate(problem.updatedAt)}
          </Text>
        </View>
      </Card>
      
      {/* Fotos */}
      {problem.photos && problem.photos.length > 0 && (
        <Card containerStyle={styles.photoCard}>
          <Card.Title>Fotos</Card.Title>
          <Card.Divider />
          
          <ScrollView horizontal style={styles.photoScroll}>
            {problem.photos.map((photo, index) => (
              <TouchableOpacity key={index} style={styles.photoTouchable}>
                <Image
                  source={{ uri: photo }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>
      )}
      
      {/* Ações */}
      <Card containerStyle={styles.actionsCard}>
        <View style={styles.actionsContainer}>
          <Button
            icon={<Ionicons name="thumbs-up" size={20} color="white" style={styles.buttonIcon} />}
            title={` ${problem.upvotes} Votos`}
            type="solid"
            containerStyle={styles.actionButton}
            onPress={handleUpvote}
          />
          
          <Button
            icon={<Ionicons name="share-social" size={20} color="white" style={styles.buttonIcon} />}
            title=" Compartilhar"
            type="solid"
            containerStyle={styles.actionButton}
          />
        </View>
      </Card>
      
      {/* Comentários */}
      <Card containerStyle={styles.commentsCard}>
        <Card.Title>Comentários</Card.Title>
        <Card.Divider />
        
        {problem.comments && problem.comments.length > 0 ? (
          problem.comments.map((comment) => (
            <View key={comment.id} style={styles.commentContainer}>
              <View style={styles.commentHeader}>
                <Avatar
                  rounded
                  title={comment.userName.charAt(0)}
                  containerStyle={{
                    backgroundColor: comment.isOfficial ? '#1E88E5' : '#9E9E9E',
                  }}
                  size="small"
                />
                <View style={styles.commentUserInfo}>
                  <Text style={styles.commentUserName}>
                    {comment.userName}
                    {comment.isOfficial && (
                      <Text style={styles.officialBadge}> (Oficial)</Text>
                    )}
                  </Text>
                  <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
                </View>
              </View>
              
              <Text style={styles.commentText}>{comment.text}</Text>
              <Divider style={styles.commentDivider} />
            </View>
          ))
        ) : (
          <Text style={styles.noCommentsText}>Nenhum comentário ainda. Seja o primeiro!</Text>
        )}
        
        {/* Adicionar comentário */}
        <View style={styles.addCommentContainer}>
          <Input
            placeholder="Adicione um comentário..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            inputContainerStyle={styles.commentInput}
          />
          <Button
            title="Enviar"
            onPress={handleComment}
            loading={commentLoading}
            disabled={commentLoading || !commentText.trim()}
          />
        </View>
      </Card>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    marginVertical: 10,
  },
  retryButton: {
    marginTop: 20,
    width: 200,
  },
  header: {
    padding: 15,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 3,
  },
  chipIcon: {
    marginRight: 5,
  },
  mapContainer: {
    position: 'relative',
    height: 200,
    marginVertical: 10,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  expandMapButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  detailsCard: {
    borderRadius: 10,
    marginHorizontal: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginVertical: 10,
  },
  metaInfo: {
    marginTop: 15,
  },
  metaText: {
    marginVertical: 3,
    color: '#666',
  },
  photoCard: {
    borderRadius: 10,
    marginHorizontal: 10,
  },
  photoScroll: {
    flexDirection: 'row',
  },
  photoTouchable: {
    marginRight: 10,
  },
  photo: {
    width: 200,
    height: 150,
    borderRadius: 5,
  },
  actionsCard: {
    borderRadius: 10,
    marginHorizontal: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    width: '45%',
  },
  buttonIcon: {
    marginRight: 5,
  },
  commentsCard: {
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 20,
  },
  commentContainer: {
    marginBottom: 15,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  commentUserInfo: {
    marginLeft: 10,
  },
  commentUserName: {
    fontWeight: 'bold',
  },
  officialBadge: {
    color: '#1E88E5',
    fontWeight: 'bold',
  },
  commentDate: {
    fontSize: 12,
    color: '#666',
  },
  commentText: {
    marginLeft: 40,
    marginBottom: 5,
  },
  commentDivider: {
    marginTop: 10,
  },
  noCommentsText: {
    marginVertical: 15,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  addCommentContainer: {
    marginTop: 10,
  },
  commentInput: {
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
});

export default ProblemDetailScreen;