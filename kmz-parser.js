/**
 * KMZ and KML Parser
 * Extracts Placemarks with coordinates, names, and descriptions from .kmz and .kml files
 */

class KmzParser {
  /**
   * Parse a File object (.kmz or .kml)
   * @param {File} file 
   * @returns {Promise<{ name: string, places: Array<{ id: string, name: string, lat: number, lng: number, desc?: string, file: string }> }>}
   */
  static async parseFile(file) {
    const fileName = file.name.replace(/\.(kmz|kml)$/i, '');
    const isKmz = file.name.toLowerCase().endsWith('.kmz');

    let kmlContent = '';

    if (isKmz) {
      if (typeof JSZip === 'undefined') {
        throw new Error('Biblioteca JSZip não carregada para descompactar KMZ.');
      }
      const zip = await JSZip.loadAsync(file);
      
      // Look for .kml file inside zip (usually doc.kml or similar)
      const kmlFileName = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.kml'));
      
      if (!kmlFileName) {
        throw new Error('Nenhum arquivo KML encontrado dentro do arquivo KMZ.');
      }
      
      kmlContent = await zip.file(kmlFileName).async('string');
    } else {
      kmlContent = await file.text();
    }

    const places = this.parseKmlString(kmlContent, fileName);
    return {
      id: 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: fileName,
      fileName: file.name,
      placesCount: places.length,
      places: places,
      createdAt: Date.now()
    };
  }

  /**
   * Parse KML XML string
   * @param {string} kmlString 
   * @param {string} sourceName 
   * @returns {Array<{ id: string, name: string, lat: number, lng: number, desc?: string, file: string }>}
   */
  static parseKmlString(kmlString, sourceName) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlString, 'text/xml');
    
    // Check for XML parse errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('XML Parser Error:', parserError.textContent);
    }

    const placemarks = xmlDoc.querySelectorAll('Placemark');
    const results = [];

    placemarks.forEach((pm, index) => {
      const nameNode = pm.querySelector('name');
      const descNode = pm.querySelector('description');
      const pointCoordsNode = pm.querySelector('Point coordinates') || pm.querySelector('coordinates');

      let name = nameNode ? nameNode.textContent.trim() : `Local ${index + 1}`;
      let desc = descNode ? descNode.textContent.trim() : '';

      if (pointCoordsNode) {
        const rawCoords = pointCoordsNode.textContent.trim();
        const parsed = this.parseCoordinatesString(rawCoords);
        
        if (parsed) {
          results.push({
            id: `place_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
            name: name,
            desc: desc,
            lat: parsed.lat,
            lng: parsed.lng,
            file: sourceName,
            formattedCoords: `${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`
          });
        }
      }
    });

    return results;
  }

  /**
   * Parse "lng,lat,alt" or multiple coordinates
   * @param {string} coordStr 
   * @returns {{ lat: number, lng: number } | null}
   */
  static parseCoordinatesString(coordStr) {
    // Extract first coordinate set if multiple (space or newline separated)
    const firstCoord = coordStr.trim().split(/\s+/)[0];
    if (!firstCoord) return null;

    const parts = firstCoord.split(',');
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    return null;
  }
}
