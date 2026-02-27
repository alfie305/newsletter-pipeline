import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

export interface SubscriberProfile {
  id: string;
  email: string;
  first_name: string | null;
  city: string | null;
  role: string | null;
  interests: string[];
  created_at: string;
  updated_at: string;
}

export interface CityStats {
  city: string;
  subscriber_count: number;
  percentage: number;
}

export interface RoleStats {
  role: string;
  subscriber_count: number;
  percentage: number;
}

export interface InterestStats {
  interest: string;
  subscriber_count: number;
  percentage: number;
}

export interface SubscriberAnalytics {
  total_subscribers: number;
  top_cities: CityStats[];
  top_roles: RoleStats[];
  top_interests: InterestStats[];
}

/**
 * Service for querying subscriber data from Supabase
 */
export class SupabaseService {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
    logger.info('Supabase service initialized', { url: supabaseUrl });
  }

  /**
   * Get total subscriber count
   */
  async getTotalSubscribers(): Promise<number> {
    try {
      const { count, error } = await this.client
        .from('subscriber_profiles')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      return count || 0;
    } catch (error) {
      logger.error('Failed to get total subscribers', { error: error.message });
      return 0;
    }
  }

  /**
   * Get top cities by subscriber count
   */
  async getTopCities(limit: number = 10): Promise<CityStats[]> {
    try {
      // Get all subscribers with cities
      const { data, error } = await this.client
        .from('subscriber_profiles')
        .select('city')
        .not('city', 'is', null);

      if (error) throw error;

      // Count cities
      const cityCounts = new Map<string, number>();
      data.forEach((profile) => {
        const city = profile.city;
        cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
      });

      // Get total for percentage calculation
      const total = data.length;

      // Convert to array and sort
      const cityStats: CityStats[] = Array.from(cityCounts.entries())
        .map(([city, count]) => ({
          city,
          subscriber_count: count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.subscriber_count - a.subscriber_count)
        .slice(0, limit);

      logger.info('Retrieved top cities', { count: cityStats.length });
      return cityStats;
    } catch (error) {
      logger.error('Failed to get top cities', { error: error.message });
      return [];
    }
  }

  /**
   * Get top roles by subscriber count
   */
  async getTopRoles(limit: number = 5): Promise<RoleStats[]> {
    try {
      const { data, error } = await this.client
        .from('subscriber_profiles')
        .select('role')
        .not('role', 'is', null);

      if (error) throw error;

      const roleCounts = new Map<string, number>();
      data.forEach((profile) => {
        const role = profile.role;
        roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
      });

      const total = data.length;

      const roleStats: RoleStats[] = Array.from(roleCounts.entries())
        .map(([role, count]) => ({
          role,
          subscriber_count: count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.subscriber_count - a.subscriber_count)
        .slice(0, limit);

      logger.info('Retrieved top roles', { count: roleStats.length });
      return roleStats;
    } catch (error) {
      logger.error('Failed to get top roles', { error: error.message });
      return [];
    }
  }

  /**
   * Get top interests by subscriber count
   */
  async getTopInterests(limit: number = 6): Promise<InterestStats[]> {
    try {
      const { data, error } = await this.client
        .from('subscriber_profiles')
        .select('interests')
        .not('interests', 'is', null);

      if (error) throw error;

      const interestCounts = new Map<string, number>();
      data.forEach((profile) => {
        profile.interests.forEach((interest: string) => {
          interestCounts.set(interest, (interestCounts.get(interest) || 0) + 1);
        });
      });

      const total = data.length;

      const interestStats: InterestStats[] = Array.from(interestCounts.entries())
        .map(([interest, count]) => ({
          interest,
          subscriber_count: count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.subscriber_count - a.subscriber_count)
        .slice(0, limit);

      logger.info('Retrieved top interests', { count: interestStats.length });
      return interestStats;
    } catch (error) {
      logger.error('Failed to get top interests', { error: error.message });
      return [];
    }
  }

  /**
   * Get comprehensive subscriber analytics
   */
  async getAnalytics(): Promise<SubscriberAnalytics> {
    try {
      const [total, cities, roles, interests] = await Promise.all([
        this.getTotalSubscribers(),
        this.getTopCities(10),
        this.getTopRoles(5),
        this.getTopInterests(6),
      ]);

      logger.info('Retrieved subscriber analytics', {
        total,
        cities: cities.length,
        roles: roles.length,
        interests: interests.length
      });

      return {
        total_subscribers: total,
        top_cities: cities,
        top_roles: roles,
        top_interests: interests,
      };
    } catch (error) {
      logger.error('Failed to get analytics', { error: error.message });
      return {
        total_subscribers: 0,
        top_cities: [],
        top_roles: [],
        top_interests: [],
      };
    }
  }

  /**
   * Get subscribers for a specific city
   */
  async getSubscribersByCity(city: string): Promise<SubscriberProfile[]> {
    try {
      const { data, error } = await this.client
        .from('subscriber_profiles')
        .select('*')
        .eq('city', city);

      if (error) throw error;

      logger.info('Retrieved subscribers by city', { city, count: data.length });
      return data as SubscriberProfile[];
    } catch (error) {
      logger.error('Failed to get subscribers by city', { city, error: error.message });
      return [];
    }
  }
}
