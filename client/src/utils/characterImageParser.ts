import { CharacterCardV2 } from '../types/character';

class CharacterImageParser {

  async extractFromPNG(file: File): Promise<CharacterCardV2 | null> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const dataView = new DataView(arrayBuffer);

      // Check PNG signature
      if (!this.isPNG(dataView)) {
        throw new Error('File is not a valid PNG');
      }

      // Parse PNG chunks to find text data
      const textData = this.extractTextChunks(dataView);

      // Look for character data in text chunks
      for (const text of textData) {
        const characterData = this.parseCharacterData(text);
        if (characterData) {
          // Convert and optimize image for avatar
          const optimizedImageUrl = await this.optimizeImageForAvatar(file);

          // Set the optimized image as avatar
          characterData.data.avatar = optimizedImageUrl;

          return characterData;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to extract character data from PNG:', error);
      throw error;
    }
  }

  private isPNG(dataView: DataView): boolean {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < signature.length; i++) {
      if (dataView.getUint8(i) !== signature[i]) {
        return false;
      }
    }
    return true;
  }

  private extractTextChunks(dataView: DataView): string[] {
    const textChunks: string[] = [];
    let offset = 8; // Skip PNG signature

    try {
      while (offset < dataView.byteLength - 8) {
        // Read chunk length (4 bytes, big-endian)
        const length = dataView.getUint32(offset);
        offset += 4;

        // Read chunk type (4 bytes)
        const type = this.readString(dataView, offset, 4);
        offset += 4;

        // If this is a text chunk, extract the data
        if (['tEXt', 'zTXt', 'iTXt'].includes(type)) {
          const chunkData = this.extractChunkText(dataView, offset, length, type);
          if (chunkData) {
            textChunks.push(chunkData);
          }
        }

        // Skip chunk data and CRC
        offset += length + 4;

        // Stop at IEND
        if (type === 'IEND') {
          break;
        }
      }
    } catch (error) {
      console.warn('Error parsing PNG chunks:', error);
    }

    return textChunks;
  }

  private extractChunkText(dataView: DataView, offset: number, length: number, type: string): string | null {
    try {
      if (type === 'tEXt') {
        // tEXt: keyword\0text
        const data = new Uint8Array(dataView.buffer, dataView.byteOffset + offset, length);
        const nullIndex = data.indexOf(0);

        if (nullIndex !== -1) {
          // Extract keyword
          const keywordBytes = data.slice(0, nullIndex);
          const keyword = this.decodeText(keywordBytes);

          // Extract text after null separator
          const textBytes = data.slice(nullIndex + 1);
          const text = this.decodeText(textBytes);

          console.log(`Found tEXt chunk - keyword: "${keyword}", text length: ${text.length}`);

          // Common keywords for character data
          if (['chara', 'character', 'char', 'ccv2', 'json'].includes(keyword.toLowerCase())) {
            return text;
          }

          // Sometimes the entire chunk is just JSON without a keyword
          if (this.looksLikeJSON(text)) {
            return text;
          }
        } else {
          // No null separator, treat entire chunk as text
          const text = this.decodeText(data);
          if (this.looksLikeJSON(text)) {
            return text;
          }
        }
      } else if (type === 'zTXt') {
        // zTXt: keyword\0compression\0compressed-text
        const data = new Uint8Array(dataView.buffer, dataView.byteOffset + offset, length);
        const nullIndex = data.indexOf(0);
        
        if (nullIndex !== -1 && nullIndex < length - 2) {
          const keyword = this.decodeText(data.slice(0, nullIndex));
          const compressionMethod = data[nullIndex + 1];
          
          if (compressionMethod === 0) { // deflate compression
            try {
              // Decompress using pako or similar library
              // For now, we'll skip compressed chunks
              console.log(`Found compressed zTXt chunk with keyword: "${keyword}"`);
            } catch (e) {
              console.warn('Failed to decompress zTXt chunk:', e);
            }
          }
        }
      } else if (type === 'iTXt') {
        // iTXt: international text - more complex format
        // For now, try simple text extraction
        const data = new Uint8Array(dataView.buffer, dataView.byteOffset + offset, length);
        const text = this.decodeText(data);
        if (this.looksLikeJSON(text)) {
          return text;
        }
      }

    } catch (error) {
      console.warn('Error extracting chunk text:', error);
    }

    return null;
  }

  private looksLikeJSON(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.startsWith('{') || trimmed.includes('"spec"') || trimmed.includes('chara_card_v2');
  }

  private decodeText(bytes: Uint8Array): string {
    // Try multiple decoding strategies
    const strategies = [
      // 1. Standard UTF-8
      () => new TextDecoder('utf-8', { fatal: false }).decode(bytes),
      
      // 2. Windows-1252 (common for Windows-created files)
      () => this.decodeWindows1252(bytes),
      
      // 3. ISO-8859-1 (Latin-1)
      () => new TextDecoder('iso-8859-1', { fatal: false }).decode(bytes),
      
      // 4. Raw ASCII with UTF-8 sequences
      () => this.decodeRawWithUTF8(bytes)
    ];

    for (const strategy of strategies) {
      try {
        const decoded = strategy();
        // Check if the decoded text looks reasonable
        if (this.isReasonableText(decoded)) {
          return decoded;
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback: return the best attempt
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  private decodeWindows1252(bytes: Uint8Array): string {
    // Windows-1252 to Unicode mapping for characters 128-255
    const windows1252 = [
      0x20AC, 0x81, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021,
      0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0x8D, 0x017D, 0x8F,
      0x90, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
      0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x9D, 0x017E, 0x0178
    ];

    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      if (byte < 0x80) {
        result += String.fromCharCode(byte);
      } else if (byte >= 0x80 && byte <= 0x9F) {
        // Windows-1252 specific range
        result += String.fromCharCode(windows1252[byte - 0x80]);
      } else {
        // Standard ISO-8859-1 range
        result += String.fromCharCode(byte);
      }
    }
    return result;
  }

  private decodeRawWithUTF8(bytes: Uint8Array): string {
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      
      // Check for UTF-8 sequences
      if ((byte & 0x80) === 0) {
        // ASCII
        result += String.fromCharCode(byte);
      } else if ((byte & 0xE0) === 0xC0) {
        // 2-byte UTF-8
        if (i + 1 < bytes.length) {
          const byte2 = bytes[i + 1];
          if ((byte2 & 0xC0) === 0x80) {
            const codePoint = ((byte & 0x1F) << 6) | (byte2 & 0x3F);
            result += String.fromCharCode(codePoint);
            i++;
            continue;
          }
        }
        // Invalid UTF-8, treat as Windows-1252
        result += this.byteToWindows1252Char(byte);
      } else if ((byte & 0xF0) === 0xE0) {
        // 3-byte UTF-8
        if (i + 2 < bytes.length) {
          const byte2 = bytes[i + 1];
          const byte3 = bytes[i + 2];
          if ((byte2 & 0xC0) === 0x80 && (byte3 & 0xC0) === 0x80) {
            const codePoint = ((byte & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F);
            result += String.fromCharCode(codePoint);
            i += 2;
            continue;
          }
        }
        // Invalid UTF-8, treat as Windows-1252
        result += this.byteToWindows1252Char(byte);
      } else {
        // Not valid UTF-8 start byte, treat as Windows-1252
        result += this.byteToWindows1252Char(byte);
      }
    }
    return result;
  }

  private byteToWindows1252Char(byte: number): string {
    // Windows-1252 specific mappings for 0x80-0x9F range
    const windows1252Map: { [key: number]: string } = {
      0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„',
      0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ',
      0x89: '‰', 0x8A: 'Š', 0x8B: '‹', 0x8C: 'Œ',
      0x8E: 'Ž', 0x91: "'", 0x92: "'", 0x93: '"',
      0x94: '"', 0x95: '•', 0x96: '–', 0x97: '—',
      0x98: '˜', 0x99: '™', 0x9A: 'š', 0x9B: '›',
      0x9C: 'œ', 0x9E: 'ž', 0x9F: 'Ÿ'
    };

    if (byte >= 0x80 && byte <= 0x9F && windows1252Map[byte]) {
      return windows1252Map[byte];
    }
    return String.fromCharCode(byte);
  }

  private isReasonableText(text: string): boolean {
    // Check if text contains reasonable characters
    // High percentage of control characters or replacement characters indicates bad decoding
    let controlChars = 0;
    let replacementChars = 0;
    
    for (let i = 0; i < Math.min(text.length, 1000); i++) {
      const code = text.charCodeAt(i);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        controlChars++;
      }
      if (code === 0xFFFD) { // Unicode replacement character
        replacementChars++;
      }
    }
    
    const sampleSize = Math.min(text.length, 1000);
    return (controlChars / sampleSize) < 0.1 && (replacementChars / sampleSize) < 0.1;
  }

  private readString(dataView: DataView, offset: number, length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += String.fromCharCode(dataView.getUint8(offset + i));
    }
    return result;
  }

  private parseCharacterData(text: string): CharacterCardV2 | null {
    try {
      let jsonText = text.trim();
      
      // Check if the text is base64 encoded
      if (this.isBase64(jsonText)) {
        console.log('Detected base64 encoded data, decoding...');
        try {
          // Decode base64
          const decoded = atob(jsonText);
          // The decoded text might have UTF-8 sequences, so decode it properly
          const bytes = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
          }
          jsonText = new TextDecoder('utf-8').decode(bytes);
          console.log('Successfully decoded base64 data');
        } catch (e) {
          console.warn('Failed to decode base64:', e);
          return null;
        }
      }
      
      // Find the start of JSON
      const jsonStart = jsonText.indexOf('{');
      if (jsonStart > 0) {
        jsonText = jsonText.substring(jsonStart);
      }

      // Find the end of JSON by counting braces
      let braceCount = 0;
      let jsonEnd = -1;
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < jsonText.length; i++) {
        const char = jsonText[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !inString) {
          inString = true;
        } else if (char === '"' && inString) {
          inString = false;
        }
        
        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i;
              break;
            }
          }
        }
      }
      
      if (jsonEnd !== -1) {
        jsonText = jsonText.substring(0, jsonEnd + 1);
      }

      console.log('Attempting to parse JSON:', jsonText.substring(0, 200) + '...');

      const parsed = JSON.parse(jsonText);

      if (this.isValidCharacterCard(parsed)) {
        console.log('Valid character card found:', parsed.data.name);
        return parsed;
      } else {
        console.log('Invalid character card structure');
      }
    } catch (error) {
      console.warn('Failed to parse JSON from text:', error);
    }

    return null;
  }

  private isBase64(str: string): boolean {
    // Check if string looks like base64
    if (str.length % 4 !== 0) return false;
    
    // Common base64 pattern for JSON (starts with eyJ which is '{"' in base64)
    if (str.startsWith('eyJ')) return true;
    
    // General base64 pattern check
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    return base64Regex.test(str);
  }

  private isValidCharacterCard(data: any): data is CharacterCardV2 {
    const isValid = data &&
      typeof data === 'object' &&
      data.spec === 'chara_card_v2' &&
      data.data &&
      typeof data.data.name === 'string';

    console.log('Character card validation:', {
      hasData: !!data,
      hasSpec: data?.spec === 'chara_card_v2',
      hasDataObject: !!data?.data,
      hasName: typeof data?.data?.name === 'string',
      isValid
    });

    return isValid;
  }

  private async fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Optimize image for avatar use (resize and compress)
  private async optimizeImageForAvatar(file: File, maxSize: number = 256): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          // Calculate new dimensions (square, max 256px)
          const size = Math.min(maxSize, Math.max(img.width, img.height));
          canvas.width = size;
          canvas.height = size;

          // Draw image centered and scaled
          const scale = size / Math.max(img.width, img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const x = (size - scaledWidth) / 2;
          const y = (size - scaledHeight) / 2;

          ctx.fillStyle = '#000000'; // Black background
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

          // Convert to optimized data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality JPEG
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Alternative method: try to extract from base64 encoded data in the PNG
  async extractFromPNGAlternative(file: File): Promise<CharacterCardV2 | null> {
    try {
      const text = await file.text();

      // Look for base64 encoded JSON
      const base64Patterns = [
        /eyJ[\w\+\/=]+/g, // Common start of base64 JSON
        /data:application\/json;base64,([A-Za-z0-9+/=]+)/g
      ];

      for (const pattern of base64Patterns) {
        const matches = text.match(pattern);
        if (matches) {
          for (const match of matches) {
            try {
              const base64Data = match.replace('data:application/json;base64,', '');
              const decoded = atob(base64Data);
              const parsed = JSON.parse(decoded);

              if (this.isValidCharacterCard(parsed)) {
                const imageDataUrl = await this.fileToDataURL(file);
                parsed.data.avatar = imageDataUrl;
                return parsed;
              }
            } catch (e) {
              continue;
            }
          }
        }
      }
    } catch (error) {
      console.error('Alternative extraction failed:', error);
    }

    return null;
  }
}

export const characterImageParser = new CharacterImageParser();