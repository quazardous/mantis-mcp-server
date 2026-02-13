import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { config } from '../config/index.js';
import { log } from '../utils/logger.js';

export interface Issue {
  id: number;
  summary: string;
  description: string;
  status: {
    id: number;
    name: string;
  };
  project: {
    id: number;
    name: string;
  };
  category: {
    id: number;
    name: string;
  };
  reporter: {
    id: number;
    name: string;
    email: string;
  };
  handler?: {
    id: number;
    name: string;
    email: string;
  };
  priority?: {
    id: number;
    name: string;
  };
  severity?: {
    id: number;
    name: string;
  };
  custom_fields?: Array<{
    field: {
      id: number;
      name: string;
    };
    value: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface IssueSearchParams {
  projectId?: number;
  statusId?: number;
  handlerId?: number;
  reporterId?: number;
  priority?: number;
  severity?: number;
  pageSize?: number;
  page?: number;
  search?: string;
  select?: string[];
  filterId?: number;
  sort?: string;
  dir?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  real_name?: string;
  access_level?: {
    id: number;
    name: string;
  };
  enabled?: boolean;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  status: {
    id: number;
    name: string;
  };
}

export class MantisApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'MantisApiError';
  }
}

export class MantisApi {
  async getUserByUsername(username: string): Promise<User> {
    const cacheKey = `user_${username}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data;
    }

    try {
      const response = await this.api.get(`/users/username/${encodeURIComponent(username)}`);
      const user = response.data;

      this.cache.set(cacheKey, {
        data: user,
        timestamp: Date.now()
      });

      return user;
    } catch (error) {
      if (error instanceof MantisApiError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new MantisApiError(`Failed to get user info: ${error.message}`);
      }
      throw new MantisApiError('Failed to get user info');
    }
  }
  private api: AxiosInstance;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor() {
    if (!config.MANTIS_API_URL) {
      log.error('Mantis API URL is not set');
      throw new Error('Mantis API URL is not set');
    }

    this.api = axios.create({
      baseURL: config.MANTIS_API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.MANTIS_API_KEY && { 'Authorization': config.MANTIS_API_KEY }),
      },
    });

    log.info('Mantis API client initialized', {
      baseURL: config.MANTIS_API_URL,
      timeout: 10000,
      hasApiKey: !!config.MANTIS_API_KEY
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const errorMessage = `API error: ${error.response.status} ${error.response.statusText}`;
          log.error(errorMessage, {
            status: error.response.status,
            data: error.response.data,
            url: error.config?.url
          });
          throw new MantisApiError(
            errorMessage,
            error.response.status,
            error.response.data
          );
        } else if (error.request) {
          const errorMessage = 'No API response received';
          log.error(errorMessage, {
            url: error.config?.url,
            method: error.config?.method
          });
          throw new MantisApiError(errorMessage, 0);
        } else {
          const errorMessage = `Request error: ${error.message}`;
          log.error(errorMessage, {
            url: error.config?.url,
            error: error.message
          });
          throw new MantisApiError(errorMessage);
        }
      }
    );
  }

  // Wrap API calls with caching
  private async cachedRequest<T>(
    key: string,
    requestFn: () => Promise<AxiosResponse<T>>
  ): Promise<T> {
    if (config.CACHE_ENABLED) {
      const cachedData = this.cache.get(key);
      const now = Date.now();
      
      // If cache is valid and not expired
      if (
        cachedData &&
        now - cachedData.timestamp < config.CACHE_TTL_SECONDS * 1000
      ) {
        log.debug('Using cached data', { key, age: (now - cachedData.timestamp) / 1000 });
        return cachedData.data;
      }
    }
    
    // No cache or cache expired, execute request
    log.debug('Sending API request', { key });
    const response = await requestFn();
    
    if (config.CACHE_ENABLED) {
      this.cache.set(key, {
        data: response.data,
        timestamp: Date.now(),
      });
      log.debug('Cache updated', { key });
    }
    
    return response.data;
  }

  // Get issue list
  async getIssues(params: IssueSearchParams = {}): Promise<Issue[]> {
    log.info('Fetching issue list', { params });
    
    // Build filter URL
    let filter = '';
    if (params.projectId) filter += `&project_id=${params.projectId}`;
    if (params.statusId) filter += `&status_id=${params.statusId}`;
    if (params.handlerId) filter += `&handler_id=${params.handlerId}`;
    if (params.reporterId) filter += `&reporter_id=${params.reporterId}`;
    if (params.priority) filter += `&priority=${params.priority}`;
    if (params.severity) filter += `&severity=${params.severity}`;
    if (params.search) filter += `&search=${encodeURIComponent(params.search)}`;
    if (params.filterId) filter += `&filter_id=${params.filterId}`;
    if (params.select?.length) filter += `&select=${params.select.join(',')}`;
    if (params.sort) filter += `&sort=${encodeURIComponent(params.sort)}`;
    if (params.dir) filter += `&dir=${encodeURIComponent(params.dir)}`;

    const pageSize = params.pageSize || 50;
    const page = params.page ||1;
    
    const cacheKey = `issues-${filter}-${page}-${pageSize}`;
    
    const response = await this.cachedRequest<{issues: Issue[]}>(cacheKey, () => {
      return this.api.get(`/issues?page=${page}&page_size=${pageSize}${filter}`);
    });

    return response.issues;
  }

  // Get single issue details
  async getIssueById(issueId: number): Promise<Issue> {
    log.info('Fetching issue details', { issueId });

    const cacheKey = `issue-${issueId}`;

    const response = await this.cachedRequest<{issues: Issue[]}>(cacheKey, () => {
      return this.api.get(`/issues/${issueId}`);
    });
    return response.issues[0];
  }

  // Get current user info
  async getCurrentUser(): Promise<User> {
    log.info('Fetching current user info');
    
    const cacheKey = 'current-user';
    
    return this.cachedRequest<User>(cacheKey, () => {
      return this.api.get('/users/me');
    });
  }

  // Get user info by ID
  async getUser(userId: number): Promise<User> {
    log.info('Fetching user info', { userId });
    
    if (!userId) {
      throw new MantisApiError('User ID is required');
    }
    
    const cacheKey = `user-${userId}`;
    
    return this.cachedRequest<User>(cacheKey, () => {
      return this.api.get(`/users/${userId}`);
    });
  }

  // Get project list
  async getProjects(): Promise<Project[]> {
    log.info('Fetching project list');
    
    const cacheKey = 'projects';
    
    return this.cachedRequest<Project[]>(cacheKey, () => {
      return this.api.get('/projects');
    });
  }

  // Get all users for a specific project
  async getUsersByProjectId(projectId: number): Promise<User[]> {
    log.info('Fetching all users for project', { projectId });
    
    const cacheKey = `users-by-project-${projectId}`;
    
    return this.cachedRequest<User[]>(cacheKey, () => {
      return this.api.get(`/projects/${projectId}/users`);
    });
  }

  // Clear cache
  clearCache() {
    log.info('Clearing API cache');
    this.cache.clear();
  }

  // Create issue
  async createIssue(issueData: any): Promise<Issue> {
    log.info('Creating issue', { issueData });
    const response = await this.api.post('/issues', issueData);
    this.clearCache(); // Clear cache because a new issue was created
    return response.data.issue;
  }

  // Update issue
  async updateIssue(issueId: number, updateData: any): Promise<Issue> {
    log.info('Updating issue', { issueId, updateData });
    try {
      const response = await this.api.patch(`/issues/${issueId}`, updateData);
      this.clearCache();
      if (response.data?.issue) {
        return response.data.issue;
      }
    } catch (error) {
      log.warn('PATCH update failed, fetching issue to confirm', { issueId, error: error instanceof Error ? error.message : error });
      this.clearCache();
    }
    // Fallback: always return the current issue state
    return await this.getIssueById(issueId);
  }

  // Change issue status with optional note
  async changeIssueStatus(issueId: number, status: string, resolution?: string, note?: string): Promise<Issue> {
    log.info('Changing issue status', { issueId, status, resolution, note });
    if (note) {
      await this.addIssueNote(issueId, { text: note, view_state: { name: 'public' } });
    }
    const updateData: any = { status: { name: status } };
    if (resolution) {
      updateData.resolution = { name: resolution };
    }
    try {
      const response = await this.api.patch(`/issues/${issueId}`, updateData);
      this.clearCache();
      if (response.data?.issue) {
        return response.data.issue;
      }
    } catch (error) {
      log.warn('PATCH status change failed, fetching issue to confirm', { issueId, error: error instanceof Error ? error.message : error });
      this.clearCache();
    }
    // Fallback: always return the current issue state
    return await this.getIssueById(issueId);
  }

  // Get SOAP endpoint URL derived from REST API URL
  private getSoapUrl(): string {
    // MANTIS_API_URL is like https://mantis.example.com/api/rest
    // SOAP endpoint is at https://mantis.example.com/api/soap/mantisconnect.php
    const baseUrl = config.MANTIS_API_URL.replace(/\/api\/rest\/?$/, '');
    return `${baseUrl}/api/soap/mantisconnect.php`;
  }

  // Search issues using SOAP API (supports text search unlike REST API)
  async searchIssues(params: {
    search?: string;
    projectId?: number;
    statusId?: number;
    handlerId?: number;
    reporterId?: number;
    pageSize?: number;
    page?: number;
    sort?: string;
    sortDirection?: string;
  }): Promise<Issue[]> {
    log.info('Searching issues via SOAP API', { params });

    const soapUrl = this.getSoapUrl();
    const apiKey = config.MANTIS_API_KEY || '';

    // Build filter fields
    let filterFields = '';
    if (params.search) {
      filterFields += `<search>${this.xmlEscape(params.search)}</search>`;
    }
    if (params.projectId) {
      filterFields += `<project_id><id>${params.projectId}</id></project_id>`;
    }
    if (params.statusId) {
      filterFields += `<status_id><id>${params.statusId}</id></status_id>`;
    }
    if (params.handlerId) {
      filterFields += `<handler_id><id>${params.handlerId}</id></handler_id>`;
    }
    if (params.reporterId) {
      filterFields += `<reporter_id><id>${params.reporterId}</id></reporter_id>`;
    }
    if (params.sort) {
      filterFields += `<sort>${this.xmlEscape(params.sort)}</sort>`;
    }
    if (params.sortDirection) {
      filterFields += `<sort_direction>${this.xmlEscape(params.sortDirection)}</sort_direction>`;
    }

    const pageNumber = (params.page || 1) - 1; // SOAP uses 0-based pages
    const perPage = params.pageSize || 50;

    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:man="http://futureware.biz/mantisconnect">
  <soapenv:Body>
    <man:mc_filter_search_issues>
      <man:username></man:username>
      <man:password>${this.xmlEscape(apiKey)}</man:password>
      <man:filter>
        ${filterFields}
      </man:filter>
      <man:page_number>${pageNumber}</man:page_number>
      <man:per_page>${perPage}</man:per_page>
    </man:mc_filter_search_issues>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
      const response = await axios.post(soapUrl, soapBody, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://futureware.biz/mantisconnect/mc_filter_search_issues',
        },
        timeout: 30000,
      });

      const parser = new XMLParser({
        ignoreAttributes: false,
        removeNSPrefix: true,
      });
      const parsed = parser.parse(response.data);

      // Navigate SOAP response structure
      const body = parsed?.Envelope?.Body;
      const result = body?.mc_filter_search_issuesResponse?.return;

      if (!result) {
        // Check for SOAP fault
        const fault = body?.Fault;
        if (fault) {
          throw new MantisApiError(`SOAP fault: ${fault.faultstring || 'Unknown error'}`);
        }
        return [];
      }

      // Normalize to array
      const items = Array.isArray(result) ? result : [result];

      // Map SOAP issue format to our Issue interface
      return items.map((item: any) => this.mapSoapIssue(item));
    } catch (error) {
      if (error instanceof MantisApiError) throw error;
      if (error instanceof Error) {
        throw new MantisApiError(`SOAP search failed: ${error.message}`);
      }
      throw new MantisApiError('SOAP search failed');
    }
  }

  private xmlEscape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private mapSoapIssue(item: any): Issue {
    return {
      id: Number(item.id) || 0,
      summary: item.summary || '',
      description: item.description || '',
      status: {
        id: Number(item.status?.id) || 0,
        name: item.status?.name || '',
      },
      project: {
        id: Number(item.project?.id) || 0,
        name: item.project?.name || '',
      },
      category: {
        id: 0,
        name: item.category || '',
      },
      reporter: {
        id: Number(item.reporter?.id) || 0,
        name: item.reporter?.name || '',
        email: item.reporter?.email || '',
      },
      handler: item.handler ? {
        id: Number(item.handler.id) || 0,
        name: item.handler.name || '',
        email: item.handler.email || '',
      } : undefined,
      priority: item.priority ? {
        id: Number(item.priority.id) || 0,
        name: item.priority.name || '',
      } : undefined,
      severity: item.severity ? {
        id: Number(item.severity.id) || 0,
        name: item.severity.name || '',
      } : undefined,
      custom_fields: item.custom_fields ? (Array.isArray(item.custom_fields) ? item.custom_fields : [item.custom_fields]).map((cf: any) => ({
        field: { id: Number(cf.field?.id) || 0, name: cf.field?.name || '' },
        value: cf.value || '',
      })) : undefined,
      created_at: item.date_submitted || '',
      updated_at: item.last_updated || '',
    };
  }

  // Add issue note
  async addIssueNote(issueId: number, noteData: any): Promise<any> {
    log.info('Adding issue note', { issueId, noteData });
    const response = await this.api.post(`/issues/${issueId}/notes`, noteData);
    this.clearCache(); // Clear cache because issue was updated
    return response.data;
  }
}

// Create singleton instance
export const mantisApi = new MantisApi();

export default mantisApi; 