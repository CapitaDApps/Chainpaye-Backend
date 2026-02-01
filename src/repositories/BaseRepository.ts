// @ts-nocheck - Mongoose v9 type compatibility issues with older @types/mongoose
import mongoose, { Document, Model, UpdateQuery, QueryOptions, ClientSession } from 'mongoose';
import { PaginationParams, PaginationResponse } from '../types/common';

export interface RepositoryOptions {
  session?: ClientSession;
  lean?: boolean;
  populate?: string | string[];
}

export abstract class BaseRepository<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>, options?: RepositoryOptions): Promise<T> {
    try {
      const createOptions: any = {};
      if (options?.session) {
        createOptions.session = options.session;
      }

      const document = new this.model(data);
      const saved = await document.save(createOptions);
      
      if (options?.populate) {
        return await saved.populate(options.populate);
      }
      
      return saved;
    } catch (error) {
      throw this.handleError(error, 'create');
    }
  }

  /**
   * Find document by ID
   */
  async findById(id: string, options?: RepositoryOptions): Promise<T | null> {
    try {
      let query = this.model.findById(id);
      
      if (options?.session) {
        query = query.session(options.session);
      }
      
      if (options?.lean) {
        query = query.lean();
      }
      
      if (options?.populate) {
        query = query.populate(options.populate);
      }
      
      // @ts-ignore - Mongoose v9 type compatibility issue
      return await query.exec();
    } catch (error) {
      throw this.handleError(error, 'findById');
    }
  }

  /**
   * Find one document by filter
   */
  async findOne(filter: any, options?: RepositoryOptions): Promise<T | null> {
    try {
      let query = this.model.findOne(filter);
      
      if (options?.session) {
        query = query.session(options.session);
      }
      
      if (options?.lean) {
        query = query.lean();
      }
      
      if (options?.populate) {
        query = query.populate(options.populate);
      }
      
      // @ts-ignore - Mongoose v9 type compatibility issue
      return await query.exec();
    } catch (error) {
      throw this.handleError(error, 'findOne');
    }
  }

  /**
   * Find multiple documents
   */
  async find(filter: any = {}, options?: RepositoryOptions): Promise<T[]> {
    try {
      let query = this.model.find(filter);
      
      if (options?.session) {
        query = query.session(options.session);
      }
      
      if (options?.lean) {
        query = query.lean();
      }
      
      if (options?.populate) {
        query = query.populate(options.populate);
      }
      
      // @ts-ignore - Mongoose v9 type compatibility issue
      return await query.exec();
    } catch (error) {
      throw this.handleError(error, 'find');
    }
  }

  /**
   * Find with pagination
   */
  async findWithPagination(
    filter: any = {},
    pagination: PaginationParams,
    options?: RepositoryOptions
  ): Promise<{ documents: T[]; pagination: PaginationResponse }> {
    try {
      const page = pagination.page || 1;
      const limit = Math.min(pagination.limit || 20, 100); // Max 100 items per page
      const skip = (page - 1) * limit;
      
      // Build sort object
      const sort: any = {};
      if (pagination.sortBy) {
        sort[pagination.sortBy] = pagination.sortOrder === 'desc' ? -1 : 1;
      } else {
        sort.createdAt = -1; // Default sort by creation date descending
      }

      // Count total documents
      const total = await this.model.countDocuments(filter);
      
      // Find documents with pagination
      let query = this.model.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      if (options?.session) {
        query = query.session(options.session);
      }
      
      if (options?.lean) {
        query = query.lean();
      }
      
      if (options?.populate) {
        query = query.populate(options.populate);
      }
      
      // @ts-ignore - Mongoose v9 type compatibility issue
      const documents = await query.exec();
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        documents,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw this.handleError(error, 'findWithPagination');
    }
  }

  /**
   * Update document by ID
   */
  async updateById(
    id: string,
    update: UpdateQuery<T>,
    options?: RepositoryOptions & { returnNew?: boolean }
  ): Promise<T | null> {
    try {
      const updateOptions: QueryOptions = {
        new: options?.returnNew !== false, // Default to returning new document
        runValidators: true,
      };
      
      if (options?.session) {
        updateOptions.session = options.session;
      }
      
      let query = this.model.findByIdAndUpdate(id, update, updateOptions);
      
      if (options?.populate) {
        query = query.populate(options.populate);
      }
      
      return await query.exec();
    } catch (error) {
      throw this.handleError(error, 'updateById');
    }
  }

  /**
   * Update one document by filter
   */
  async updateOne(
    filter: any,
    update: UpdateQuery<T>,
    options?: RepositoryOptions & { returnNew?: boolean }
  ): Promise<T | null> {
    try {
      const updateOptions: QueryOptions = {
        new: options?.returnNew !== false,
        runValidators: true,
      };
      
      if (options?.session) {
        updateOptions.session = options.session;
      }
      
      let query = this.model.findOneAndUpdate(filter, update, updateOptions);
      
      if (options?.populate) {
        query = query.populate(options.populate);
      }
      
      return await query.exec();
    } catch (error) {
      throw this.handleError(error, 'updateOne');
    }
  }

  /**
   * Delete document by ID
   */
  async deleteById(id: string, options?: RepositoryOptions): Promise<T | null> {
    try {
      const deleteOptions: QueryOptions = {};
      
      if (options?.session) {
        deleteOptions.session = options.session;
      }
      
      return await this.model.findByIdAndDelete(id, deleteOptions).exec();
    } catch (error) {
      throw this.handleError(error, 'deleteById');
    }
  }

  /**
   * Delete one document by filter
   */
  async deleteOne(filter: any, options?: RepositoryOptions): Promise<T | null> {
    try {
      const deleteOptions: QueryOptions = {};
      
      if (options?.session) {
        deleteOptions.session = options.session;
      }
      
      return await this.model.findOneAndDelete(filter, deleteOptions).exec();
    } catch (error) {
      throw this.handleError(error, 'deleteOne');
    }
  }

  /**
   * Count documents
   */
  async count(filter: any = {}, options?: RepositoryOptions): Promise<number> {
    try {
      let query = this.model.countDocuments(filter);
      
      if (options?.session) {
        query = query.session(options.session);
      }
      
      return await query.exec();
    } catch (error) {
      throw this.handleError(error, 'count');
    }
  }

  /**
   * Check if document exists
   */
  async exists(filter: any, options?: RepositoryOptions): Promise<boolean> {
    try {
      let query = this.model.exists(filter);
      
      if (options?.session) {
        query = query.session(options.session);
      }
      
      const result = await query.exec();
      return result !== null;
    } catch (error) {
      throw this.handleError(error, 'exists');
    }
  }

  /**
   * Start a database transaction
   */
  async withTransaction<R>(
    operation: (session: ClientSession) => Promise<R>
  ): Promise<R> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        return await operation(session);
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * Handle database errors
   */
  protected handleError(error: any, operation: string): Error {
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return new Error(`Duplicate ${field}: ${error.keyValue?.[field] || 'value'}`);
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return new Error(`Validation error: ${messages.join(', ')}`);
    }
    
    if (error.name === 'CastError') {
      return new Error(`Invalid ${error.path}: ${error.value}`);
    }
    
    // Log the original error for debugging
    console.error(`Repository ${operation} error:`, error);
    
    return new Error(`Database ${operation} failed: ${error.message}`);
  }
}