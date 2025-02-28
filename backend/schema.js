import { gql } from 'apollo-server-express';

const typeDefs = gql`
  enum Severity {
    LOW
    MEDIUM
    HIGH
  }

  enum Category {
    TRAFFIC
    INFRASTRUCTURE
    SECURITY
    ENVIRONMENT
    PUBLIC_LIGHTING
    OTHERS
  }

  enum Status {
    REPORTED
    IN_REVIEW
    IN_PROGRESS
    RESOLVED
    CLOSED
  }

  type Location {
    latitude: Float!
    longitude: Float!
    address: String
  }

  type Photo {
    url: String!
    createdAt: String!
  }

  type Comment {
    id: ID!
    text: String!
    userId: ID!
    userName: String
    isOfficial: Boolean!
    createdAt: String!
  }

  type Problem {
    id: ID!
    title: String!
    description: String!
    location: Location!
    severity: Severity!
    category: Category!
    photos: [Photo]
    status: Status!
    reportedBy: ID!
    reporterName: String
    comments: [Comment]
    upvotes: Int!
    createdAt: String!
    updatedAt: String!
    assignedTo: ID
  }

  type User {
    id: ID!
    name: String!
    email: String!
    isAuthority: Boolean!
    profilePicture: String
    createdAt: String!
    reportedProblems: [ID]
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Dashboard {
    totalProblems: Int!
    resolvedProblems: Int!
    pendingProblems: Int!
    problemsByCategory: [CategoryCount]
    problemsBySeverity: [SeverityCount]
    recentProblems: [Problem]
  }

  type CategoryCount {
    category: Category!
    count: Int!
  }

  type SeverityCount {
    severity: Severity!
    count: Int!
  }

  type Query {
    problem(id: ID!): Problem
    problems(
      category: Category, 
      severity: Severity, 
      status: Status, 
      nearLocation: LocationInput, 
      radius: Float
    ): [Problem]
    
    user(id: ID!): User
    me: User
    
    dashboard: Dashboard
    heatmapData: [Problem]
  }

  input LocationInput {
    latitude: Float!
    longitude: Float!
  }

  input ProblemInput {
    title: String!
    description: String!
    location: LocationInput!
    severity: Severity!
    category: Category!
    photos: [String]
  }

  input CommentInput {
    problemId: ID!
    text: String!
  }

  type Mutation {
    registerUser(name: String!, email: String!, password: String!): AuthPayload
    login(email: String!, password: String!): AuthPayload
    
    reportProblem(problem: ProblemInput!): Problem
    updateProblemStatus(id: ID!, status: Status!): Problem
    assignProblem(id: ID!, assignedTo: ID!): Problem
    addComment(comment: CommentInput!): Comment
    uploadPhoto(problemId: ID!, photoBase64: String!): Photo
    upvoteProblem(id: ID!): Problem
  }

  type Subscription {
    problemReported: Problem
    problemUpdated(id: ID): Problem
    nearbyProblemReported(latitude: Float!, longitude: Float!, radius: Float!): Problem
  }
`;

export default typeDefs;