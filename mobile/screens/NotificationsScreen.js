// mobile/screens/NotificationsScreen.js
import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { ListItem, Button, Divider } from 'react-native-elements';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, gql } from '@apollo/client';

// Simulação de consulta para obter notificações
// Em um ambiente real, você teria uma consulta GraphQL real aqui
const GET_NOTIFICATIONS = gql`
  query GetNotifications {
    me {
      id
    }
  }
`;

// Dados simulados para notificações
const mockNotifications = [
  {
    id: '1',
    type: 'STATUS_UPDATE',
    title: 'Status atualizado',
    message: 'Seu problema "Buraco na Rua X" teve o status alterado para "Em Andamento".',
    problemId: '123',
    read: false,
    createdAt: '2023-05-02T15:30:00Z',
  },
  {
    id: '2',
    type: 'COMMENT',
    title: 'Novo comentário',
    message: 'A Prefeitura comentou no seu problema "Iluminação defeituosa".',
    problemId: '456',
    read: true,
    createdAt: '2023-05-01T10:15:00Z',
  },
  {
    id: '3',
    type: 'NEARBY',
    title: 'Problema próximo',
    message: 'Um novo problema foi reportado perto de você: "Semáforo quebrado".',
    problemId: '789',
    read: false,
    createdAt: '2023-04-30T09:45:00Z',
  },
  {
    id: '4',
    type: 'RESOLVED',
    title: 'Problema resolvido',
    message: 'Seu problema "Bueiro entupido" foi marcado como resolvido.',
    problemId: '101',
    read: true,
    createdAt: '2023-04-28T14:20:00Z',
  },
  {
    id: '5',
    type: 'UPVOTE',
    title: 'Novo voto',
    message: 'Seu problema "Buraco na Rua X" recebeu um novo voto.',
    problemId: '123',
    read: false,
    createdAt: '2023-04-25T16:10:00Z',
  },
];

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [refreshing, setRefreshing] = useState(false);
  
  // Consulta para obter notificações (simulada)
  const { loading, refetch } = useQuery(GET_NOTIFICATIONS, {
    onCompleted: () => {
      // Em um cenário real, você atualizaria as notificações aqui
      // Para este exemplo, estamos usando dados simulados
    }
  });
  
  // Função para marcar notificação como lida
  const markAsRead = (id) => {
    setNotifications(
      notifications.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  };
  
  // Função para marcar todas como lidas
  const markAllAsRead = () => {
    setNotifications(
      notifications.map(notification => ({ ...notification, read: true }))
    );
  };
  
  // Função para excluir uma notificação
  const deleteNotification = (id) => {
    setNotifications(
      notifications.filter(notification => notification.id !== id)
    );
  };
  
  // Função para obter ícone com base no tipo de notificação
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'STATUS_UPDATE':
        return { name: 'refresh-circle', color: '#2196F3' };
      case 'COMMENT':
        return { name: 'chatbubble', color: '#4CAF50' };
      case 'NEARBY':
        return { name: 'location', color: '#FF9800' };
      case 'RESOLVED':
        return { name: 'checkmark-circle', color: '#4CAF50' };
      case 'UPVOTE':
        return { name: 'thumbs-up', color: '#9C27B0' };
      default:
        return { name: 'notifications', color: '#757575' };
    }
  };
  
  // Formatação de data relativa
  const getRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'agora mesmo';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} atrás`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hora' : 'horas'} atrás`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? 'dia' : 'dias'} atrás`;
    }
  };
  
  // Função para atualizar notificações
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  
  // Renderizar item de notificação
  const renderNotificationItem = ({ item }) => {
    const icon = getNotificationIcon(item.type);
    
    return (
      <ListItem 
        containerStyle={[
          styles.notificationItem,
          !item.read && styles.unreadNotification
        ]}
        onPress={() => {
          markAsRead(item.id);
          navigation.navigate('ProblemDetail', { problemId: item.problemId });
        }}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        
        <ListItem.Content>
          <ListItem.Title style={styles.notificationTitle}>
            {item.title}
          </ListItem.Title>
          <ListItem.Subtitle style={styles.notificationMessage}>
            {item.message}
          </ListItem.Subtitle>
          <Text style={styles.notificationTime}>
            {getRelativeTime(item.createdAt)}
          </Text>
        </ListItem.Content>
        
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={() => deleteNotification(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </ListItem>
    );
  };
  
  // Renderizar o cabeçalho
  const renderHeader = () => {
    const unreadCount = notifications.filter(n => !n.read).length;
    
    return (
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Notificações</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadContainer}>
            <Text style={styles.unreadText}>{unreadCount} não lidas</Text>
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markAllReadText}>Marcar todas como lidas</Text>
            </TouchableOpacity>
          </View>
        )}
        <Divider style={styles.divider} />
      </View>
    );
  };
  
  // Renderizar quando não há notificações
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off" size={60} color="#BDBDBD" />
      <Text style={styles.emptyText}>Você não tem notificações</Text>
      <Button
        title="Atualizar"
        type="outline"
        containerStyle={styles.refreshButton}
        onPress={onRefresh}
      />
    </View>
  );
  
  return (
    <View style={styles.container}>
      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Carregando notificações...</Text>
        </View>
      ) : (
        <>
          {renderHeader()}
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={item => item.id}
            contentContainerStyle={notifications.length === 0 && styles.emptyList}
            ListEmptyComponent={renderEmptyList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
          />
        </>
      )}
    </View>
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  headerContainer: {
    backgroundColor: 'white',
    padding: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  unreadContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  unreadText: {
    fontSize: 14,
    color: '#1E88E5',
    fontWeight: 'bold',
  },
  markAllReadText: {
    fontSize: 14,
    color: '#1E88E5',
  },
  divider: {
    marginTop: 10,
  },
  notificationItem: {
    paddingVertical: 12,
    marginVertical: 2,
    backgroundColor: 'white',
  },
  unreadNotification: {
    backgroundColor: 'rgba(30, 136, 229, 0.05)',
  },
  iconContainer: {
    position: 'relative',
    width: 30,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E88E5',
  },
  notificationTitle: {
    fontWeight: 'bold',
    marginBottom: 3,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 10,
    marginBottom: 20,
  },
  refreshButton: {
    width: 150,
  },
});

export default NotificationsScreen;