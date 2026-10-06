/**
 * Storage Helper for Sirenes KMZ App
 * Handles saving/loading files and active selection to localStorage
 */

const STORAGE_KEY_FILES = 'sirenes_kmz_files_v2';
const STORAGE_KEY_ACTIVE = 'sirenes_kmz_active_files_v2';
const STORAGE_KEY_THEME = 'sirenes_theme_v1';
const STORAGE_KEY_AUTH = 'sirenes_auth_v1';

class StorageManager {
  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  static isAuthenticated() {
    return localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
  }

  /**
   * Save authentication state
   * @param {boolean} status 
   */
  static setAuthenticated(status) {
    if (status) {
      localStorage.setItem(STORAGE_KEY_AUTH, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }
  }
  /**
   * Get all stored files
   * @returns {Array<Object>}
   */
  static getFiles() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_FILES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading files from storage:', e);
      return [];
    }
  }

  /**
   * Save all files
   * @param {Array<Object>} files 
   */
  static saveFiles(files) {
    try {
      localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(files));
    } catch (e) {
      console.error('Error saving files to storage:', e);
    }
  }

  /**
   * Add a new file
   * @param {Object} fileData 
   */
  static addFile(fileData) {
    const files = this.getFiles();
    // Check if duplicate name, replace or append
    const existingIndex = files.findIndex(f => f.name.toLowerCase() === fileData.name.toLowerCase());
    if (existingIndex >= 0) {
      files[existingIndex] = fileData;
    } else {
      files.push(fileData);
    }
    this.saveFiles(files);
    return files;
  }

  /**
   * Delete a file by id
   * @param {string} fileId 
   */
  static deleteFile(fileId) {
    let files = this.getFiles();
    files = files.filter(f => f.id !== fileId);
    this.saveFiles(files);

    // Also remove from active files if it was active
    let activeIds = this.getActiveFileIds();
    activeIds = activeIds.filter(id => id !== fileId);
    this.saveActiveFileIds(activeIds);

    return files;
  }

  /**
   * Get active file IDs
   * @returns {Array<string>}
   */
  static getActiveFileIds() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_ACTIVE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Save active file IDs
   * @param {Array<string>} ids 
   */
  static saveActiveFileIds(ids) {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(ids));
    } catch (e) {
      console.error('Error saving active file ids:', e);
    }
  }

  /**
   * Get current theme ('dark' | 'light')
   */
  static getTheme() {
    return localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
  }

  /**
   * Save theme
   */
  static saveTheme(theme) {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }
}
