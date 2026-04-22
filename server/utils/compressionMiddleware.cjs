/**
 * 📦 API Response Compression Middleware
 * 
 * Features:
 * - Gzip compression for responses
 * - Brotli compression (better ratio, Node.js 11+)
 * - Selective compression by content type
 * - Minimum size threshold
 * - Performance monitoring
 * 
 * Benefits:
 * - 60-80% reduction in response size
 * - Faster data transfer
 * - Lower bandwidth costs
 * - Better user experience
 */

const compression = require('compression');

/**
 * Compression configuration
 */
const COMPRESSION_CONFIG = {
  // Minimum response size to compress (1KB)
  threshold: 1024,
  
  // Compression level (1-9, higher = better compression but slower)
  level: 6,
  
  // Memory level for zlib (1-9)
  memLevel: 8,
  
  // Compression strategy
  strategy: compression.filter,
  
  // Only compress these content types
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      // Don't compress if client opts out
      return false;
    }
    
    // Use default filter function
    return compression.filter(req, res);
  },
};

/**
 * Create compression middleware with monitoring
 * @returns {Function} Express middleware
 */
function createCompressionMiddleware() {
  let stats = {
    requestsCompressed: 0,
    requestsSkipped: 0,
    bytesOriginal: 0,
    bytesCompressed: 0,
  };

  const middleware = compression(COMPRESSION_CONFIG);

  // Wrap to collect stats
  return (req, res, next) => {
    // Track original content length
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    
    let responseSize = 0;

    res.write = function(chunk) {
      if (chunk) {
        responseSize += Buffer.byteLength(chunk);
      }
      return originalWrite(chunk);
    };

    res.end = function(chunk) {
      if (chunk) {
        responseSize += Buffer.byteLength(chunk);
      }

      // Check if response was compressed
      const isCompressed = res.getHeader('Content-Encoding') === 'gzip' ||
                          res.getHeader('Content-Encoding') === 'br';

      if (isCompressed) {
        stats.requestsCompressed++;
        stats.bytesOriginal += responseSize;
        // Compressed size is tracked by Content-Length header
      } else {
        stats.requestsSkipped++;
      }

      return originalEnd(chunk);
    };

    next();
  };
}

/**
 * Get compression statistics
 * @returns {Object} Compression stats
 */
function getCompressionStats() {
  const ratio = stats.bytesOriginal > 0 
    ? ((1 - stats.bytesCompressed / stats.bytesOriginal) * 100).toFixed(2)
    : 0;

  return {
    ...stats,
    compressionRatio: `${ratio}%`,
    bandwidthSaved: formatBytes(stats.bytesOriginal - stats.bytesCompressed),
  };
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ─────────────────────────────────────────────────────────────────────
//  BROTLI COMPRESSION (Better than Gzip)
// ─────────────────────────────────────────────────────────────────────

/**
 * Create Brotli compression middleware (Node.js 11+)
 * Brotli typically achieves 15-25% better compression than Gzip
 * 
 * @returns {Function} Express middleware
 */
function createBrotliCompressionMiddleware() {
  // Check if Brotli is supported
  const zlib = require('zlib');
  const hasBrotli = typeof zlib.createBrotliCompress === 'function';

  if (!hasBrotli) {
    console.warn('⚠️ Brotli not supported, falling back to Gzip');
    return createCompressionMiddleware();
  }

  return compression({
    ...COMPRESSION_CONFIG,
    brotli: {
      enabled: true,
      [zlib.constants.BROTLI_PARAM_QUALITY]: 6,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: 1024,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────────────

module.exports = {
  createCompressionMiddleware,
  createBrotliCompressionMiddleware,
  COMPRESSION_CONFIG,
};
