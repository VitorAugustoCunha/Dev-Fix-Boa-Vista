// mobile/screens/DashboardScreen.js
import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  RefreshControl, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { Card, Button, ListItem, Badge } from 'react-native-elements';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, gql } from '@apollo/client';
import {
  LineChart,
  BarChart,
  PieChart,
} from 'react-native-chart-kit';

// Consulta para obter dados do dashboard
const GET_DASHBOARD_DATA = gql`
  query GetDashboardData {
    dashboard {
      totalProblems
      resolvedProblems
      pendingProblems
      problemsByCategory {
        category
        count
      }
      problemsBySeverity {
        severity
        count
      }
      recentProblems {
        id
        title
        category
        severity
        status
        createdAt
      }
    }
  }
`;

const DashboardScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  
  // Consulta para obter dados do dashboard
  const { loading, error, data, refetch } = useQuery(GET_DASHBOARD_DATA);
  
  // Função para atualizar o dashboard
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  
  // Função para obter cor com base na gravidade
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'LOW': return '#4CAF50'; // Verde
      case 'MEDIUM': return '#FFC107'; // Amarelo
      case 'HIGH': return '#F44336'; // Vermelho
      default: return '#9E9E9E'; // Cinza
    }
  };
  
  // Função para obter cor com base na categoria
  const getCategoryColor = (category) => {
    switch (category) {
      case 'TRAFFIC': return '#2196F3'; // Azul
      case 'INFRASTRUCTURE': return '#FF9800'; // Laranja
      case 'SECURITY': return '#F44336'; // Vermelho
      case 'ENVIRONMENT': return '#4CAF50'; // Verde
      case 'PUBLIC_LIGHTING': return '#FFC107'; // Amarelo
      case 'OTHERS': return '#9E9E9E'; // Cinza
      default: return '#9E9E9E';
    }
  };
  
  // Tradução de categorias
  const categoryTranslation = {
    TRAFFIC: 'Trânsito',
    INFRASTRUCTURE: 'Infraestrutura',
    SECURITY: 'Segurança',
    ENVIRONMENT: 'Meio Ambiente',
    PUBLIC_LIGHTING: 'Iluminação',
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
  
  // Formatação de data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };
  
  // Dados para o gráfico de resumo
  const getSummaryChartData = () => {
    const dashboard = data?.dashboard;
    if (!dashboard) return null;
    
    return {
      labels: ['Total', 'Pendentes', 'Resolvidos'],
      datasets: [
        {
          data: [
            dashboard.totalProblems,
            dashboard.pendingProblems,
            dashboard.resolvedProblems
          ],
          color: (opacity = 1) => `rgba(30, 136, 229, ${opacity})`,
        }
      ],
    };
  };
  
  // Dados para o gráfico de categorias
  const getCategoryChartData = () => {
    const problemsByCategory = data?.dashboard?.problemsByCategory;
    if (!problemsByCategory) return null;
    
    return {
      labels: problemsByCategory.map(item => categoryTranslation[item.category]),
      datasets: [
        {
          data: problemsByCategory.map(item => item.count),
          colors: problemsByCategory.map(item => 
            () => getCategoryColor(item.category)
          ),
        }
      ],
    };
  };
  
  // Dados para o gráfico de severidades
  const getSeverityChartData = () => {
    const problemsBySeverity = data?.dashboard?.problemsBySeverity;
    if (!problemsBySeverity) return null;
    
    return {
      labels: ['Baixa', 'Média', 'Alta'],
      datasets: [
        {
          data: problemsBySeverity.map(item => item.count),
          colors: [
            () => '#4CAF50', // Verde para LOW
            () => '#FFC107', // Amarelo para MEDIUM
            () => '#F44336', // Vermelho para HIGH
          ]
        }
      ],
    };
  };
  
  // Configuração do gráfico
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(30, 136, 229, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };
  
  const screenWidth = Dimensions.get('window').width - 30;
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color="red" />
        <Text style={styles.errorText}>Erro ao carregar dados:</Text>
        <Text>{error.message}</Text>
        <Button 
          title="Tentar novamente" 
          onPress={refetch} 
          containerStyle={styles.retryButton}
        />
      </View>
    );
  }
  
  const dashboard = data?.dashboard;
  
  if (!dashboard) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Dados não encontrados</Text>
      </View>
    );
  }
  
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      {/* Cartões de resumo */}
      <View style={styles.summaryContainer}>
        <Card containerStyle={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="alert-circle" size={24} color="#1E88E5" />
          </View>
          <Text style={styles.summaryValue}>{dashboard.totalProblems}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </Card>
        
        <Card containerStyle={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="time" size={24} color="#FF9800" />
          </View>
          <Text style={styles.summaryValue}>{dashboard.pendingProblems}</Text>
          <Text style={styles.summaryLabel}>Pendentes</Text>
        </Card>
        
        <Card containerStyle={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.summaryValue}>{dashboard.resolvedProblems}</Text>
          <Text style={styles.summaryLabel}>Resolvidos</Text>
        </Card>
      </View>
      
      {/* Gráfico de resumo */}
      <Card containerStyle={styles.chartCard}>
        <Card.Title>Resumo de Problemas</Card.Title>
        <Card.Divider />
        
        <BarChart
          data={getSummaryChartData()}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          verticalLabelRotation={0}
          style={styles.chart}
        />
      </Card>
      
      {/* Gráfico por categoria */}
      <Card containerStyle={styles.chartCard}>
        <Card.Title>Problemas por Categoria</Card.Title>
        <Card.Divider />
        
        <PieChart
          data={dashboard.problemsByCategory.map(item => ({
            name: categoryTranslation[item.category],
            count: item.count,
            color: getCategoryColor(item.category),
            legendFontColor: '#7F7F7F',
            legendFontSize: 12,
          }))}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          accessor="count"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          style={styles.chart}
        />
      </Card>
      
      {/* Gráfico por severidade */}
      <Card containerStyle={styles.chartCard}>
        <Card.Title>Problemas por Gravidade</Card.Title>
        <Card.Divider />
        
        <BarChart
          data={getSeverityChartData()}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          verticalLabelRotation={0}
          style={styles.chart}
        />
      </Card>
      
      {/* Problemas recentes */}
      <Card containerStyle={styles.recentProblemsCard}>
        <Card.Title>Problemas Recentes</Card.Title>
        <Card.Divider />
        
        {dashboard.recentProblems.map((problem, index) => (
          <ListItem 
            key={index} 
            bottomDivider={index < dashboard.recentProblems.length - 1}
            onPress={() => navigation.navigate('ProblemDetail', { problemId: problem.id })}
          >
            <View style={[
              styles.severityIndicator, 
              { backgroundColor: getSeverityColor(problem.severity) }
            ]} />
            
            <ListItem.Content>
              <ListItem.Title>{problem.title}</ListItem.Title>
              <ListItem.Subtitle>
                {categoryTranslation[problem.category]} • {formatDate(problem.createdAt)}
              </ListItem.Subtitle>
            </ListItem.Content>
            
            <Badge 
              value={statusTranslation[problem.status]} 
              status={
                problem.status === 'RESOLVED' || problem.status === 'CLOSED' 
                  ? 'success' 
                  : problem.status === 'IN_PROGRESS' 
                    ? 'warning' 
                    : 'primary'
              }
            />
            <ListItem.Chevron />
          </ListItem>
        ))}
        
        <Button
          title="Ver Todos os Problemas"
          type="clear"
          containerStyle={styles.viewAllButton}
          onPress={() => navigation.navigate('AllProblems')}
        />
      </Card>
      
      {/* Ações rápidas */}
      <Card containerStyle={styles.actionsCard}>
        <Card.Title>Ações Rápidas</Card.Title>
        <Card.Divider />
        
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('AssignProblems')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#1E88E5' }]}>
              <Ionicons name="person-add" size={24} color="white" />
            </View>
            <Text style={styles.actionButtonText}>Atribuir Problemas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('ReportList')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="document-text" size={24} color="white" />
            </View>
            <Text style={styles.actionButtonText}>Relatórios</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('HeatmapView')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#FF5722' }]}>
              <Ionicons name="flame" size={24} color="white" />
            </View>
            <Text style={styles.actionButtonText}>Mapa de Calor</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#607D8B' }]}>
              <Ionicons name="settings" size={24} color="white" />
            </View>
            <Text style={styles.actionButtonText}>Configurações</Text>
          </TouchableOpacity>
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
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  summaryCard: {
    flex: 1,
    margin: 5,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ECEFF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#757575',
  },
  chartCard: {
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  recentProblemsCard: {
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  severityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  viewAllButton: {
    marginTop: 10,
  },
  actionsCard: {
    borderRadius: 10,
    marginHorizontal: 10,
    marginBottom: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DashboardScreen;