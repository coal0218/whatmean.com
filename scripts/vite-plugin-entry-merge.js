import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'fs'
import { join, relative, resolve } from 'path'
import { createHash } from 'crypto'

function getAllJsonFiles(dir) {
  const files = []
  const items = readdirSync(dir)
  
  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)
    
    if (stat.isDirectory()) {
      files.push(...getAllJsonFiles(fullPath))
    } else if (item.endsWith('.json')) {
      files.push(fullPath)
    }
  }
  
  return files
}

function getFileHash(filePath) {
  const content = readFileSync(filePath)
  return createHash('md5').update(content).digest('hex')
}

function getEntriesHash(jsonFiles) {
  const hashes = jsonFiles.map(file => `${relative(process.cwd(), file)}:${getFileHash(file)}`).sort()
  return createHash('md5').update(hashes.join('|')).digest('hex')
}

function getCacheFilePath() {
  return resolve(process.cwd(), 'node_modules', '.vite-entry-merge-cache.json')
}

function loadCachedHash() {
  const cacheFile = getCacheFilePath()
  
  try {
    if (existsSync(cacheFile)) {
      const cacheContent = readFileSync(cacheFile, 'utf-8')
      const cache = JSON.parse(cacheContent)
      return cache.hash || null
    }
  } catch (error) {
    console.warn('[entry-merge] Failed to load cache:', error.message)
  }
  
  return null
}

function saveCachedHash(hash) {
  const cacheFile = getCacheFilePath()
  
  try {
    writeFileSync(cacheFile, JSON.stringify({ hash, timestamp: Date.now() }), 'utf-8')
  } catch (error) {
    console.warn('[entry-merge] Failed to save cache:', error.message)
  }
}

export default function entryMergePlugin(options = {}) {
  const entryDir = options.entryDir || resolve(process.cwd(), 'entry')
  const outputFile = options.outputFile || 'all-entrys.json'
  const forceRebuild = options.forceRebuild || false
  
  return {
    name: 'vite-plugin-entry-merge',
    
    buildStart() {
      if (!existsSync(entryDir)) {
        console.warn(`[entry-merge] Entry directory not found: ${entryDir}`)
        return
      }
      
      try {
        const jsonFiles = getAllJsonFiles(entryDir)
        
        if (jsonFiles.length === 0) {
          console.warn('[entry-merge] No JSON files found in entry directory')
          return
        }
        
        const currentHash = getEntriesHash(jsonFiles)
        const cachedHash = loadCachedHash()
        
        if (!forceRebuild && cachedHash === currentHash && options.skipUnchanged !== false) {
          const outputPath = resolve(process.cwd(), 'dist', outputFile)
          
          if (existsSync(outputPath)) {
            console.log('[entry-merge] Entries unchanged, skipping merge (incremental build)')
            this.emitFile({
              type: 'asset',
              fileName: outputFile,
              source: readFileSync(outputPath)
            })
            return
          }
        }
        
        console.log(`[entry-merge] Merging ${jsonFiles.length} JSON entries...`)
        const startTime = performance.now()
        
        const entries = []
        
        for (const file of jsonFiles) {
          try {
            const content = readFileSync(file, 'utf-8')
            const jsonData = JSON.parse(content)
            
            if (jsonData && typeof jsonData === 'object') {
              entries.push({
                _source: relative(process.cwd(), file),
                ...jsonData
              })
            }
          } catch (error) {
            console.error(`[entry-merge] Error processing ${file}:`, error.message)
          }
        }
        
        const mergedContent = JSON.stringify(entries, null, 2)
        const endTime = performance.now()
        
        console.log(`[entry-merge] Successfully merged ${entries.length} entries in ${(endTime - startTime).toFixed(2)}ms`)
        
        saveCachedHash(currentHash)
        
        this.emitFile({
          type: 'asset',
          fileName: outputFile,
          source: mergedContent
        })
        
      } catch (error) {
        console.error('[entry-merge] Error during entry merge:', error)
      }
    },
    
    writeBundle() {
      const outputPath = resolve(process.cwd(), 'dist', outputFile)
      
      if (!existsSync(outputPath)) {
        console.warn(`[entry-merge] Output file not found at ${outputPath}`)
        return
      }
      
      try {
        const content = readFileSync(outputPath, 'utf-8')
        const parsed = JSON.parse(content)
        console.log(`[entry-merge] Verified output: ${parsed.length} entries written to ${outputFile}`)
      } catch (error) {
        console.error('[entry-merge] Output verification failed:', error.message)
      }
    }
  }
}
