import L from 'leaflet';

export type OfflineMapTheme = 'cadastral' | 'dark' | 'minimal';

export interface OfflineGridLayerOptions extends L.GridLayerOptions {
  theme?: OfflineMapTheme;
  showCoordinates?: boolean;
  showCrosshairs?: boolean;
  showWaterways?: boolean;
  showSheetWatermark?: boolean;
}

/**
 * 100% Self-Contained Offline Base Map Tile Layer for Leaflet.
 * 
 * Renders procedural cadastral grids, geographic coordinate lines,
 * terrain/waterway shading, and sheet quadrant references purely on
 * HTML5 Canvas with zero outbound HTTP requests to external tile servers.
 */
export class OfflineGridLayer extends L.GridLayer {
  private currentTheme: OfflineMapTheme;
  private showCoordinates: boolean;
  private showCrosshairs: boolean;
  private showWaterways: boolean;
  private showSheetWatermark: boolean;

  constructor(options?: OfflineGridLayerOptions) {
    super({
      minZoom: 5,
      maxZoom: 22,
      tileSize: 256,
      keepBuffer: 3,
      updateWhenIdle: false,
      updateWhenZooming: true,
      ...options,
    });

    this.currentTheme = options?.theme || 'cadastral';
    this.showCoordinates = options?.showCoordinates !== false;
    this.showCrosshairs = options?.showCrosshairs !== false;
    this.showWaterways = options?.showWaterways !== false;
    this.showSheetWatermark = options?.showSheetWatermark !== false;
  }

  public setTheme(theme: OfflineMapTheme): this {
    if (this.currentTheme !== theme) {
      this.currentTheme = theme;
      this.redraw();
    }
    return this;
  }

  public getTheme(): OfflineMapTheme {
    return this.currentTheme;
  }

  /**
   * Leaflet GridLayer tile factory.
   */
  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('canvas');
    tile.width = 256;
    tile.height = 256;
    tile.className = 'offline-cadastral-tile';

    const ctx = tile.getContext('2d');
    if (!ctx) {
      setTimeout(() => done(undefined, tile), 0);
      return tile;
    }

    // Calculate geographic bounds of this tile
    const bounds = (this as any)._tileCoordsToBounds(coords) as L.LatLngBounds;
    const nw = bounds.getNorthWest();
    const se = bounds.getSouthEast();

    const west = nw.lng;
    const east = se.lng;
    const north = nw.lat;
    const south = se.lat;
    const zoom = coords.z;

    this.renderProceduralTile(ctx, coords, zoom, west, east, north, south);

    // Call done asynchronously to let Leaflet's tile lifecycle finish smoothly
    setTimeout(() => {
      done(undefined, tile);
    }, 0);

    return tile;
  }

  /**
   * Render tile canvas graphics procedurally.
   */
  private renderProceduralTile(
    ctx: CanvasRenderingContext2D,
    coords: L.Coords,
    zoom: number,
    west: number,
    east: number,
    north: number,
    south: number
  ): void {
    const width = 256;
    const height = 256;

    // 1. Base Background Rendering
    this.renderBackground(ctx, width, height, west, east, north, south);

    // 2. Procedural Bangladesh Waterways & Terrain Shading
    if (this.showWaterways) {
      this.renderWaterwayAndTerrain(ctx, width, height, west, east, north, south, zoom);
    }

    // 3. Cadastral Grid Lines & Micro-Ticks
    this.renderCadastralGrid(ctx, width, height, west, east, north, south, zoom, coords);

    // 4. Cadastral Sheet Quadrants & Sheet Reference
    if (this.showSheetWatermark && zoom >= 14) {
      this.renderSheetWatermark(ctx, width, height, coords, zoom);
    }

    // 5. Geographic Coordinate Readouts
    if (this.showCoordinates) {
      this.renderCoordinateLabels(ctx, width, height, west, east, north, south, zoom);
    }
  }

  private renderBackground(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    west: number,
    east: number,
    north: number,
    south: number
  ): void {
    // Check if tile intersects Bangladesh approximate bounding box (lat 20.5-26.7, lng 88.0-92.7)
    const inBangladesh =
      east >= 88.0 && west <= 92.7 && north >= 20.5 && south <= 26.7;

    if (this.currentTheme === 'dark') {
      ctx.fillStyle = inBangladesh ? '#0f172a' : '#020617';
      ctx.fillRect(0, 0, w, h);

      // Subtle dark grid panel shading
      ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.fillRect(1, 1, w - 2, h - 2);
    } else if (this.currentTheme === 'minimal') {
      ctx.fillStyle = inBangladesh ? '#f8fafc' : '#f1f5f9';
      ctx.fillRect(0, 0, w, h);
    } else {
      // Default: 'cadastral' (Warm government survey parchment)
      ctx.fillStyle = inBangladesh ? '#faf8f2' : '#f1ede4';
      ctx.fillRect(0, 0, w, h);

      // Very subtle cadastral linen texture
      ctx.fillStyle = inBangladesh ? '#fdfcf7' : '#f5f2eb';
      ctx.fillRect(2, 2, w - 4, h - 4);
    }
  }

  private renderWaterwayAndTerrain(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    west: number,
    east: number,
    north: number,
    south: number,
    zoom: number
  ): void {
    // Bangladesh major river corridor mathematical approximation
    // Jamuna/Brahmaputra: lng ~ 89.6 -> 89.8, lat 25.5 -> 23.8
    // Padma: lng 88.8 -> 90.6, lat 24.3 -> 23.2
    // Meghna: lng 90.5 -> 90.9, lat 24.4 -> 22.3
    // Bay of Bengal / Delta: lat < 22.2

    const isDark = this.currentTheme === 'dark';
    const waterColor = isDark ? 'rgba(14, 116, 144, 0.25)' : 'rgba(186, 230, 253, 0.45)';
    const wetlandColor = isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(209, 250, 229, 0.35)';

    // Check coastal waters in southern Bangladesh (Bay of Bengal)
    if (south < 22.0 && east >= 89.0 && west <= 92.4) {
      const seaLevelY = ((north - 21.8) / (north - south)) * h;
      if (seaLevelY < h) {
        ctx.fillStyle = isDark ? 'rgba(8, 47, 73, 0.4)' : 'rgba(224, 242, 254, 0.6)';
        ctx.fillRect(0, Math.max(0, seaLevelY), w, h - Math.max(0, seaLevelY));
      }
    }

    // Procedural river approximation using sine-wave corridor
    // Padma / Meghna corridor
    const midLat = (north + south) / 2;
    const midLng = (west + east) / 2;

    if (midLat >= 22.5 && midLat <= 24.8 && midLng >= 88.6 && midLng <= 91.2) {
      // Calculate distance to idealized river center
      const expectedLng = 89.8 + 0.3 * Math.sin((midLat - 23.0) * 2.5);
      const lngDiff = Math.abs(midLng - expectedLng);

      const riverWidthDegrees = zoom >= 14 ? 0.008 : 0.03;
      if (lngDiff < riverWidthDegrees * 3) {
        ctx.fillStyle = lngDiff < riverWidthDegrees ? waterColor : wetlandColor;
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.fill();
      }
    }
  }

  private renderCadastralGrid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    west: number,
    east: number,
    north: number,
    south: number,
    zoom: number,
    coords: L.Coords
  ): void {
    const isDark = this.currentTheme === 'dark';

    // Tile border hairline
    ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(214, 211, 201, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    // Determine grid step interval in degrees based on zoom level
    let gridStep = 0.5;
    let subStep = 0.1;

    if (zoom <= 7) {
      gridStep = 1.0;
      subStep = 0.5;
    } else if (zoom <= 9) {
      gridStep = 0.25;
      subStep = 0.05;
    } else if (zoom <= 11) {
      gridStep = 0.1;
      subStep = 0.02;
    } else if (zoom <= 13) {
      gridStep = 0.02;
      subStep = 0.005;
    } else if (zoom <= 15) {
      gridStep = 0.005;
      subStep = 0.001;
    } else if (zoom <= 17) {
      gridStep = 0.001;
      subStep = 0.0002;
    } else {
      // High cadastral zoom (18 - 22): ~10m - 25m precision grids
      gridStep = 0.0004;
      subStep = 0.0001;
    }

    // 1. Render Sub-grid lines (light)
    ctx.strokeStyle = isDark ? 'rgba(71, 85, 105, 0.15)' : 'rgba(203, 213, 225, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    const minLngSub = Math.floor(west / subStep) * subStep;
    const maxLngSub = Math.ceil(east / subStep) * subStep;
    for (let lng = minLngSub; lng <= maxLngSub; lng += subStep) {
      const x = ((lng - west) / (east - west)) * w;
      if (x >= 0 && x <= w) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
    }

    const minLatSub = Math.floor(south / subStep) * subStep;
    const maxLatSub = Math.ceil(north / subStep) * subStep;
    for (let lat = minLatSub; lat <= maxLatSub; lat += subStep) {
      const y = ((north - lat) / (north - south)) * h;
      if (y >= 0 && y <= h) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
    }
    ctx.stroke();

    // 2. Render Major Cadastral Grid Lines
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(8, 127, 91, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const minLngMaj = Math.floor(west / gridStep) * gridStep;
    const maxLngMaj = Math.ceil(east / gridStep) * gridStep;
    const majX: number[] = [];
    for (let lng = minLngMaj; lng <= maxLngMaj; lng += gridStep) {
      const x = ((lng - west) / (east - west)) * w;
      if (x >= 0 && x <= w) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        majX.push(x);
      }
    }

    const minLatMaj = Math.floor(south / gridStep) * gridStep;
    const maxLatMaj = Math.ceil(north / gridStep) * gridStep;
    const majY: number[] = [];
    for (let lat = minLatMaj; lat <= maxLatMaj; lat += gridStep) {
      const y = ((north - lat) / (north - south)) * h;
      if (y >= 0 && y <= h) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        majY.push(y);
      }
    }
    ctx.stroke();

    // 3. Render Cadastral Survey Crosshairs (+) at Major Intersections
    if (this.showCrosshairs) {
      ctx.strokeStyle = isDark ? '#38bdf8' : '#087f5b';
      ctx.lineWidth = 1.2;
      const arm = 6;
      for (const x of majX) {
        for (const y of majY) {
          ctx.beginPath();
          ctx.moveTo(x - arm, y);
          ctx.lineTo(x + arm, y);
          ctx.moveTo(x, y - arm);
          ctx.lineTo(x, y + arm);
          ctx.stroke();

          // Small central point dot
          ctx.fillStyle = isDark ? '#38bdf8' : '#087f5b';
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  private renderSheetWatermark(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    coords: L.Coords,
    zoom: number
  ): void {
    const isDark = this.currentTheme === 'dark';
    ctx.save();
    ctx.font = '9px "Hind Siliguri", -apple-system, sans-serif';
    ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.35)';

    const sheetNo = ((Math.abs(coords.x + coords.y) % 8) + 1);
    const label = `মৌজা শিট-${sheetNo} · Z${zoom}`;
    ctx.fillText(label, 8, h - 8);
    ctx.restore();
  }

  private renderCoordinateLabels(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    west: number,
    east: number,
    north: number,
    south: number,
    zoom: number
  ): void {
    const isDark = this.currentTheme === 'dark';
    ctx.save();
    ctx.font = '10px "JetBrains Mono", Menlo, monospace';
    ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.7)' : 'rgba(8, 127, 91, 0.75)';

    // Step for labels
    let labelStep = 0.1;
    if (zoom <= 7) labelStep = 1.0;
    else if (zoom <= 9) labelStep = 0.5;
    else if (zoom <= 11) labelStep = 0.1;
    else if (zoom <= 13) labelStep = 0.05;
    else if (zoom <= 15) labelStep = 0.01;
    else if (zoom <= 17) labelStep = 0.002;
    else labelStep = 0.0005;

    // Longitude label (top edge of tile)
    const minLng = Math.floor(west / labelStep) * labelStep;
    const maxLng = Math.ceil(east / labelStep) * labelStep;
    for (let lng = minLng; lng <= maxLng; lng += labelStep) {
      const x = ((lng - west) / (east - west)) * w;
      if (x > 35 && x < w - 45) {
        const text = `${lng.toFixed(zoom >= 15 ? 4 : 2)}°E`;
        ctx.fillText(text, x + 4, 13);
      }
    }

    // Latitude label (left edge of tile)
    const minLat = Math.floor(south / labelStep) * labelStep;
    const maxLat = Math.ceil(north / labelStep) * labelStep;
    for (let lat = minLat; lat <= maxLat; lat += labelStep) {
      const y = ((north - lat) / (north - south)) * h;
      if (y > 20 && y < h - 20) {
        const text = `${lat.toFixed(zoom >= 15 ? 4 : 2)}°N`;
        ctx.fillText(text, 6, y - 4);
      }
    }

    ctx.restore();
  }
}

/**
 * Helper factory function.
 */
export function createOfflineGridLayer(options?: OfflineGridLayerOptions): OfflineGridLayer {
  return new OfflineGridLayer(options);
}
