import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SttService, SttOfflineError, resetSttService, getSttService } from './stt.js';

describe('SttService', () => {
  beforeEach(() => {
    resetSttService();
  });

  afterEach(() => {
    resetSttService();
  });

  describe('constructor', () => {
    it('should use default host and port', () => {
      const svc = new SttService();
      expect(svc).toBeDefined();
    });

    it('should accept custom host and port', () => {
      const svc = new SttService('10.0.0.1', 9999);
      expect(svc).toBeDefined();
    });
  });

  describe('isOnline', () => {
    it('should return false when STT server is not running', async () => {
      const offlineService = new SttService('127.0.0.1', 49999);
      const result = await offlineService.isOnline();
      expect(result).toBe(false);
    });
  });

  describe('transcribe', () => {
    it('should throw SttOfflineError when STT server is not running', async () => {
      const offlineService = new SttService('127.0.0.1', 49998);

      await expect(offlineService.transcribe(Buffer.from('test'))).rejects.toThrow(SttOfflineError);
    });
  });

  describe('singleton', () => {
    it('getSttService should return the same instance', () => {
      const svc1 = getSttService();
      const svc2 = getSttService();
      expect(svc1).toBe(svc2);
    });

    it('resetSttService should allow creating new instances', () => {
      const svc1 = getSttService();
      resetSttService();
      const svc2 = getSttService();
      expect(svc1).not.toBe(svc2);
    });
  });
});
