/**
 * Semantic Space Visualization
 *
 * Interactive D3.js visualizations for Tsirufim analysis:
 * - 2D scatter plot of semantic space
 * - Cluster visualization with colors
 * - Interactive tooltips and selection
 * - Semantic direction vectors
 * - Network graphs of word relationships
 */

/**
 * Semantic Space Visualizer
 *
 * Creates interactive 2D projection of high-dimensional semantic embeddings.
 */
export class SemanticSpaceVisualizer {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.svg = null;
    this.width = 800;
    this.height = 600;
    this.margin = { top: 20, right: 20, bottom: 40, left: 40 };
    this.data = null;
    this.colors = d3.schemeCategory10;
  }

  /**
   * Initialize visualization
   */
  initialize() {
    // Clear container
    this.container.innerHTML = '';

    // Create SVG
    this.svg = d3.select(`#${this.containerId}`)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .style('max-width', '100%')
      .style('height', 'auto');

    // Create main group
    this.g = this.svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Create axes groups
    this.g.append('g').attr('class', 'x-axis');
    this.g.append('g').attr('class', 'y-axis');

    // Create points group
    this.g.append('g').attr('class', 'points');

    // Create labels group
    this.g.append('g').attr('class', 'labels');

    // Create tooltip
    this.tooltip = d3.select('body').append('div')
      .attr('class', 'tsirufim-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'white')
      .style('border', '1px solid #ddd')
      .style('border-radius', '4px')
      .style('padding', '10px')
      .style('font-size', '14px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');
  }

  /**
   * Render clustered words in 2D space
   * @param {Object} clusterResult - Result from clustering algorithm
   * @param {Array} embeddings - 2D projected embeddings
   */
  render(clusterResult, embeddings) {
    this.data = this.prepareData(clusterResult, embeddings);

    // Create scales
    const xExtent = d3.extent(this.data, d => d.x);
    const yExtent = d3.extent(this.data, d => d.y);

    const xScale = d3.scaleLinear()
      .domain([xExtent[0] - 0.1, xExtent[1] + 0.1])
      .range([0, this.width - this.margin.left - this.margin.right]);

    const yScale = d3.scaleLinear()
      .domain([yExtent[0] - 0.1, yExtent[1] + 0.1])
      .range([this.height - this.margin.top - this.margin.bottom, 0]);

    // Draw axes
    const xAxis = d3.axisBottom(xScale).ticks(5);
    const yAxis = d3.axisLeft(yScale).ticks(5);

    this.g.select('.x-axis')
      .attr('transform', `translate(0,${this.height - this.margin.top - this.margin.bottom})`)
      .call(xAxis);

    this.g.select('.y-axis')
      .call(yAxis);

    // Draw points
    const points = this.g.select('.points')
      .selectAll('circle')
      .data(this.data)
      .join('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 6)
      .attr('fill', d => this.colors[d.cluster % this.colors.length])
      .attr('opacity', 0.7)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => this.showTooltip(event, d))
      .on('mouseout', () => this.hideTooltip())
      .on('click', (event, d) => this.selectWord(d));

    // Draw labels
    const labels = this.g.select('.labels')
      .selectAll('text')
      .data(this.data)
      .join('text')
      .attr('x', d => xScale(d.x))
      .attr('y', d => yScale(d.y) - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .attr('direction', 'rtl')
      .text(d => d.word)
      .style('pointer-events', 'none');

    // Draw cluster centroids
    if (clusterResult.centroids) {
      this.drawCentroids(clusterResult, xScale, yScale);
    }
  }

  /**
   * Prepare data for visualization
   */
  prepareData(clusterResult, embeddings) {
    const data = [];

    clusterResult.clusters.forEach((cluster, clusterIdx) => {
      cluster.words.forEach(word => {
        // Find embedding for this word
        const embedding = embeddings.find(e => e.word === word);

        if (embedding) {
          data.push({
            word: word,
            cluster: clusterIdx,
            x: embedding.x,
            y: embedding.y,
            score: embedding.score || 0
          });
        }
      });
    });

    return data;
  }

  /**
   * Draw cluster centroids
   */
  drawCentroids(clusterResult, xScale, yScale) {
    // Project centroids to 2D (simplified)
    const centroids = clusterResult.centroids.map((centroid, idx) => ({
      cluster: idx,
      x: 0, // Would need PCA/t-SNE projection
      y: 0
    }));

    // Draw centroid markers
    this.g.select('.points')
      .selectAll('.centroid')
      .data(centroids)
      .join('circle')
      .attr('class', 'centroid')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 10)
      .attr('fill', 'none')
      .attr('stroke', d => this.colors[d.cluster % this.colors.length])
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '5,5');
  }

  /**
   * Show tooltip on hover
   */
  showTooltip(event, d) {
    this.tooltip
      .style('visibility', 'visible')
      .html(`
        <div style="direction: rtl">
          <strong>${d.word}</strong><br/>
          Cluster: ${d.cluster + 1}<br/>
          Score: ${d.score.toFixed(3)}
        </div>
      `)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px');
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    this.tooltip.style('visibility', 'hidden');
  }

  /**
   * Select word (emit event for external handling)
   */
  selectWord(d) {
    console.log('Selected word:', d);

    // Dispatch custom event
    const event = new CustomEvent('wordSelected', { detail: d });
    this.container.dispatchEvent(event);

    // Highlight selected word
    this.g.selectAll('circle')
      .attr('stroke-width', dd => dd.word === d.word ? 3 : 1.5)
      .attr('stroke', dd => dd.word === d.word ? '#000' : '#fff');
  }

  /**
   * Update visualization with new data
   */
  update(clusterResult, embeddings) {
    this.render(clusterResult, embeddings);
  }

  /**
   * Clear visualization
   */
  clear() {
    if (this.svg) {
      this.svg.selectAll('*').remove();
    }
    if (this.tooltip) {
      this.tooltip.remove();
    }
  }
}

/**
 * Network Graph Visualizer
 *
 * Shows semantic relationships as force-directed graph.
 */
export class NetworkGraphVisualizer {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.svg = null;
    this.width = 800;
    this.height = 600;
    this.simulation = null;
  }

  /**
   * Initialize network visualization
   */
  initialize() {
    this.container.innerHTML = '';

    this.svg = d3.select(`#${this.containerId}`)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .style('max-width', '100%')
      .style('height', 'auto');

    this.g = this.svg.append('g');
  }

  /**
   * Render network graph
   * @param {Array} words - Words to visualize
   * @param {Array} similarities - Pairwise similarity matrix
   * @param {number} threshold - Minimum similarity to show edge
   */
  render(words, similarities, threshold = 0.5) {
    const nodes = words.map((word, i) => ({
      id: i,
      word: word,
      x: this.width / 2,
      y: this.height / 2
    }));

    const links = [];

    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < words.length; j++) {
        const sim = similarities[i][j];

        if (sim >= threshold) {
          links.push({
            source: i,
            target: j,
            similarity: sim
          });
        }
      }
    }

    // Create force simulation
    this.simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => (1 - d.similarity) * 100))
      .force('charge', d3.forceManyBody().strength(-50))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Draw links
    const link = this.g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', d => d.similarity)
      .attr('stroke-width', d => d.similarity * 3);

    // Draw nodes
    const node = this.g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 8)
      .attr('fill', '#3182ce')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .call(this.drag(this.simulation));

    // Draw labels
    const label = this.g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text(d => d.word)
      .attr('font-size', 12)
      .attr('dx', 12)
      .attr('dy', 4)
      .attr('direction', 'rtl');

    // Update positions on tick
    this.simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });
  }

  /**
   * Drag behavior for nodes
   */
  drag(simulation) {
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  /**
   * Clear visualization
   */
  clear() {
    if (this.simulation) {
      this.simulation.stop();
    }
    if (this.svg) {
      this.svg.selectAll('*').remove();
    }
  }
}

/**
 * PCA projection for dimensionality reduction
 * (Simplified 2D projection for visualization)
 */
export class PCAProjector {
  /**
   * Project high-dimensional embeddings to 2D using PCA
   * @param {Array} embeddings - Array of Float32Arrays
   * @returns {Array} 2D coordinates [{x, y}, ...]
   */
  static project(embeddings) {
    if (embeddings.length === 0) return [];

    const n = embeddings.length;
    const dim = embeddings[0].length;

    // Center data
    const mean = this.calculateMean(embeddings);
    const centered = embeddings.map(vec =>
      vec.map((v, i) => v - mean[i])
    );

    // Calculate covariance matrix (simplified: use random projection for speed)
    // In production, use actual PCA or t-SNE library

    // Random projection as fast approximation
    const projection = this.randomProjection(centered, 2);

    return projection;
  }

  /**
   * Calculate mean vector
   */
  static calculateMean(vectors) {
    const n = vectors.length;
    const dim = vectors[0].length;
    const mean = Array(dim).fill(0);

    for (const vec of vectors) {
      for (let i = 0; i < dim; i++) {
        mean[i] += vec[i];
      }
    }

    return mean.map(v => v / n);
  }

  /**
   * Random projection (fast approximation)
   */
  static randomProjection(vectors, targetDim) {
    const n = vectors.length;
    const sourceDim = vectors[0].length;

    // Generate random projection matrix
    const projMatrix = Array(targetDim).fill(null).map(() =>
      Array(sourceDim).fill(0).map(() => (Math.random() - 0.5) * 2)
    );

    // Project vectors
    return vectors.map(vec => {
      const projected = Array(targetDim).fill(0);

      for (let i = 0; i < targetDim; i++) {
        for (let j = 0; j < sourceDim; j++) {
          projected[i] += vec[j] * projMatrix[i][j];
        }
      }

      return { x: projected[0], y: projected[1] };
    });
  }
}

/**
 * Helper function to create visualizer
 */
export function createSemanticVisualizer(containerId) {
  const viz = new SemanticSpaceVisualizer(containerId);
  viz.initialize();
  return viz;
}

export function createNetworkVisualizer(containerId) {
  const viz = new NetworkGraphVisualizer(containerId);
  viz.initialize();
  return viz;
}
