import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import axios, { AxiosError } from 'axios';

// Interface pour un utilisateur
export interface User {
  _id: string;
  email: string;
  role: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UserCacheService implements OnModuleInit, OnModuleDestroy {
  private redisClient;

  constructor() {
    this.redisClient = createClient({
      url: 'redis://localhost:6379', // URL de votre instance Redis
    });

    this.redisClient.on('error', (err) => {
      console.error('❌ Erreur Redis:', err);
    });
  }

  async onModuleInit() {
    try {
      // Vérifiez si le client Redis est déjà connecté
      if (!this.redisClient.isOpen) {
        await this.redisClient.connect();
        console.log('✅ Connexion Redis réussie.');
      } else {
        console.log('✅ Redis est déjà connecté.');
      }
    } catch (error) {
      console.error('❌ Échec de connexion à Redis:', error);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.redisClient.isOpen) {
        await this.redisClient.quit();
        console.log('🔌 Déconnexion de Redis.');
      } else {
        console.log('⚠️ Redis n’était pas connecté.');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion de Redis:', error);
    }
  }

  async getJwtToken(): Promise<string> {
    const graphqlEndpoint = 'http://localhost:4000/graphql';
    const loginQuery = `
      mutation Login {
        login(email: "admin@admin.com", password: "admin123") {
          access_token
        }
      }
    `;

    try {
      const response = await axios.post(graphqlEndpoint, { query: loginQuery });

      if (!response.data?.data?.login?.access_token) {
        throw new Error('Invalid login response: Missing access_token');
      }

      return response.data.data.login.access_token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Échec de récupération du JWT:', error.response?.data || error.message);
      } else {
        console.error('❌ Erreur inattendue:', error);
      }
      throw new Error('Impossible de récupérer le JWT');
    }
  }

  async initializeCache() {
    try {
      // Vérifiez si Redis est connecté avant de continuer
      if (!this.redisClient.isOpen) {
        console.log("🔌 Redis client not connected, trying to reconnect...");
        await this.redisClient.connect();
      } else {
        console.log("✅ Redis client is already connected.");
      }
  
      const graphqlEndpoint = 'http://localhost:4000/graphql';
      const jwtToken = await this.getJwtToken();
  
      const query = `
        query GetAllUsers {
          getAllUsers {
            _id
            name
            email
            role
          }
        }
      `;
  
      const response = await axios.post(
        graphqlEndpoint,
        { query },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      if (response.data.errors) {
        throw new Error(`GraphQL Errors: ${JSON.stringify(response.data.errors)}`);
      }
  
      const users = response.data?.data?.getAllUsers;
      if (!users) {
        throw new Error('Invalid GraphQL response: Missing users data');
      }
  
      for (const user of users) {
        await this.redisClient.set(`user:${user._id}`, JSON.stringify(user), { EX: 3600 });
      }
  
      console.log('✅ Cache Redis initialisé avec tous les utilisateurs.');
    } catch (error) {
      console.error('❌ Échec de l’initialisation du cache Redis:', error);
    }
  }
  

  async getUserById(id: string): Promise<any> {
    try {
      const data = await this.redisClient.get(`user:${id}`);
      if (!data) {
        console.warn(`⚠️ Utilisateur non trouvé dans le cache: ${id}. Récupération via GraphQL...`);
        const user = await this.fetchUserFromGraphQL(id);
        if (user) {
          await this.setUserById(id, user);
        }
        return user;
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l’utilisateur depuis Redis:', error);
      throw error;
    }
  }
  
  private async fetchUserFromGraphQL(id: string): Promise<any> {
    const graphqlEndpoint = 'http://localhost:4000/graphql';
    const jwtToken = await this.getJwtToken();
  
    const query = `
      query GetUserById {
        getUserById(id: "${id}") {
          _id
          name
          email
          role
        }
      }
    `;
  
    try {
      const response = await axios.post(
        graphqlEndpoint,
        { query },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      if (response.data.errors) {
        console.error('❌ Erreur GraphQL:', response.data.errors);
        return null;
      }
  
      return response.data.data.getUserById;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l’utilisateur via GraphQL:', error);
      return null;
    }
  }

  async setUserById(id: string, user: User): Promise<void> {
    try {
      await this.redisClient.set(`user:${id}`, JSON.stringify(user), { EX: 3600 });
    } catch (error) {
      console.error('❌ Erreur lors de l’enregistrement de l’utilisateur dans Redis:', error);
      throw error;
    }
  }

  async deleteUserById(id: string): Promise<void> {
    try {
      await this.redisClient.del(`user:${id}`);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de l’utilisateur de Redis:', error);
      throw error;
    }
  }


  async getUsersByRole(role: string): Promise<User[]> {
    try {
      // Clé Redis pour stocker les utilisateurs par rôle
      const redisKey = `users_by_role:${role}`;
  
      // Tenter de récupérer les utilisateurs depuis Redis
      const cachedData = await this.redisClient.get(redisKey);
      if (cachedData) {
        console.log(`✅ Utilisateurs avec le rôle "${role}" récupérés depuis Redis.`);
        return JSON.parse(cachedData);
      }
  
      console.warn(`⚠️ Aucun utilisateur trouvé dans le cache pour le rôle "${role}". Récupération via GraphQL...`);
      const users = await this.fetchUsersByRoleFromGraphQL(role);
  
      if (!users || users.length === 0) {
        console.warn(`⚠️ Aucun utilisateur trouvé pour le rôle "${role}" dans GraphQL.`);
        return [];
      }
  
      // Stocker les utilisateurs dans Redis avec une expiration
      await this.redisClient.set(redisKey, JSON.stringify(users), { EX: 3600 });
      console.log(`✅ Utilisateurs avec le rôle "${role}" ajoutés au cache Redis.`);
  
      return users;
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération des utilisateurs avec le rôle "${role}":`, error);
      throw error;
    }
  }

  private async fetchUsersByRoleFromGraphQL(role: string): Promise<User[]> {
    const graphqlEndpoint = 'http://localhost:4000/graphql';
    const jwtToken = await this.getJwtToken();
  
    const query = `
      query GetUsersByRole($role: String!) {
        getUsersByRole(role: $role) {
          _id
          name
          email
          role
        }
      }
    `;
  
    try {
      const response = await axios.post(
        graphqlEndpoint,
        { query, variables: { role } },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      if (response.data.errors) {
        console.error('❌ Erreur GraphQL:', response.data.errors);
        return [];
      }
  
      const users = response.data?.data?.getUsersByRole;
      if (!users) {
        console.warn('⚠️ Réponse GraphQL invalide: Aucun utilisateur trouvé pour ce rôle.');
        return [];
      }
  
      return users;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des utilisateurs via GraphQL:', error);
      return [];
    }
  }
}
