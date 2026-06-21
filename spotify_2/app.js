(() => {
  const matrixFile = 'correlation_matrix.csv';
  const featureFile = 'spotify_features_by_rank_position.csv';
  const heatmapContainer = d3.select('#heatmap-container');
  const scatterContainer = d3.select('#scatter-container');
  const tooltip = d3.select('#tooltip');
  const scatterTitle = d3.select('#scatter-title');
  const scatterDescription = d3.select('#scatter-description');

  const labelMap = {
    rank: '排名',
    danceability: '舞曲性',
    energy: '能量',
    key: '调性',
    mode: '调式',
    time_signature: '拍号',
    loudness: '整体响度',
    speechiness: '语词率',
    acousticness: '原声度',
    instrumentalness: '纯音乐度',
    liveness: '现场感',
    valence: '欢快度',
    tempo: '节拍率'
  };

  const heatmapSize = 840;
  const scatterWidth = 840;
  const scatterHeight = 640;
  const cellPadding = 2;

  function wrapLabel(text, maxChars = 4) {
    const chars = Array.from(text);
    if (chars.length <= maxChars) return [text];
    const lines = [];
    let line = '';
    chars.forEach((ch, index) => {
      line += ch;
      if (line.length === maxChars || index === chars.length - 1) {
        lines.push(line);
        line = '';
      }
    });
    return lines;
  }

  Promise.all([
    d3.text(matrixFile),
    d3.csv(featureFile, d3.autoType)
  ])
    .then(([matrixText, featureData]) => {
      const matrixRows = d3.csvParseRows(matrixText);
      const variableNames = matrixRows[0].slice(1);
      const matrixCells = matrixRows.slice(1).flatMap(row => {
        const rowName = row[0];
        return variableNames.map((colName, index) => ({
          row: rowName,
          col: colName,
          value: +row[index + 1]
        }));
      });

      renderHeatmap(variableNames, matrixCells);
      renderScatterPlaceholder();

      function renderHeatmap(labels, cells) {
        heatmapContainer.selectAll('*').remove();
        const margin = { top: 120, right: 24, bottom: 24, left: 120 };
        const gridSize = (heatmapSize - margin.left - margin.right) / labels.length;
        const svg = heatmapContainer.append('svg')          .attr('viewBox', `0 0 ${heatmapSize} ${heatmapSize + 40}`)
          .attr('preserveAspectRatio', 'xMidYMid meet')          .attr('width', heatmapSize)
          .attr('height', heatmapSize + 80);

        const defs = svg.append('defs');
        const legendGradient = defs.append('linearGradient')
          .attr('id', 'heatmap-gradient')
          .attr('x1', '0%')
          .attr('x2', '100%')
          .attr('y1', '0%')
          .attr('y2', '0%');

        legendGradient.append('stop').attr('offset', '0%').attr('stop-color', '#1f3c8b');
        legendGradient.append('stop').attr('offset', '50%').attr('stop-color', '#d8e8ff');
        legendGradient.append('stop').attr('offset', '100%').attr('stop-color', '#c62828');

        const colorScale = value => {
          if (value <= 0) return '#1f3c8b';
          return d3.scaleLinear()
            .domain([0, 0.5, 1])
            .range(['#1f3c8b', '#d8e8ff', '#c62828'])(value);
        };

        const heatmap = svg.append('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);

        heatmap.selectAll('rect')
          .data(cells)
          .join('rect')
          .attr('x', d => labels.indexOf(d.col) * gridSize + cellPadding / 2)
          .attr('y', d => labels.indexOf(d.row) * gridSize + cellPadding / 2)
          .attr('width', gridSize - cellPadding)
          .attr('height', gridSize - cellPadding)
          .attr('class', 'heatmap-cell')
          .attr('fill', d => colorScale(d.value))
          .on('mouseenter', (event, d) => showTooltip(event, d))
          .on('mousemove', event => moveTooltip(event))
          .on('mouseleave', hideTooltip)
          .on('click', (_, d) => renderScatter(d.row, d.col, d.value));

        heatmap.selectAll('.cell-label')
          .data(cells)
          .join('text')
          .attr('class', 'cell-label')
          .attr('x', d => labels.indexOf(d.col) * gridSize + gridSize / 2)
          .attr('y', d => labels.indexOf(d.row) * gridSize + gridSize / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .text(d => d.value.toFixed(2));

        const rowLabels = svg.append('g')
          .attr('transform', `translate(${margin.left - 10}, ${margin.top + gridSize / 2})`);

        rowLabels.selectAll('text')
          .data(labels)
          .join('text')
          .attr('x', 0)
          .attr('y', (_, i) => i * gridSize)
          .attr('text-anchor', 'end')
          .attr('class', 'matrix-label')
          .each(function(d) {
            const lines = wrapLabel(labelMap[d] || d, 4);
            d3.select(this).selectAll('tspan')
              .data(lines)
              .join('tspan')
              .attr('x', 0)
              .attr('dy', (_, i) => i === 0 ? '-0.3em' : '1.1em')
              .text(line => line);
          });

        const colLabels = svg.append('g');

        colLabels.selectAll('text')
          .data(labels)
          .join('text')
          .attr('x', (_, i) => margin.left + i * gridSize + gridSize / 2)
          .attr('y', margin.top - 20)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'hanging')
          .attr('class', 'matrix-label')
          .each(function(d) {
            const lines = wrapLabel(labelMap[d] || d, 4);
            d3.select(this).selectAll('tspan')
              .data(lines)
              .join('tspan')
              .attr('x', (_, i, nodes) => d3.select(nodes[i].parentNode).attr('x'))
              .attr('dy', (_, i) => i === 0 ? '0em' : '1.1em')
              .text(line => line);
          });

        svg.append('text')
          .attr('x', margin.left + (heatmapSize - margin.left - margin.right) / 2)
          .attr('y', margin.top - 68)
          .attr('text-anchor', 'middle')
          .attr('class', 'heatmap-title')
          .text('变量相关系数矩阵');

        const legend = svg.append('g')
          .attr('transform', `translate(${margin.left}, ${heatmapSize + 4})`);

        legend.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', heatmapSize - margin.left - margin.right)
          .attr('height', 16)
          .attr('fill', 'url(#heatmap-gradient)');

        legend.append('text')
          .attr('x', 0)
          .attr('y', 36)
          .attr('class', 'legend-text')
          .text('0 (蓝色)');

        legend.append('text')
          .attr('x', heatmapSize - margin.left - margin.right)
          .attr('y', 36)
          .attr('text-anchor', 'end')
          .attr('class', 'legend-text')
          .text('1 (红色)');

        d3.select('#heatmap-legend').html(`
          <div class="legend-summary">
            点击任一矩阵单元格，即可在右侧查看该变量对的散点图与拟合趋势。
          </div>
        `);
      }

      function renderScatter(xKey, yKey, corrValue) {
        scatterContainer.selectAll('*').remove();
        const xLabel = labelMap[xKey] || xKey;
        const yLabel = labelMap[yKey] || yKey;
        scatterTitle.text(`${xLabel} vs ${yLabel} 散点拟合`);
        scatterDescription.text(`相关系数：${corrValue.toFixed(3)}。横轴：${xLabel}，纵轴：${yLabel}。`);

        const margin = { top: 32, right: 36, bottom: 56, left: 64 };
        const innerWidth = scatterWidth - margin.left - margin.right;
        const innerHeight = scatterHeight - margin.top - margin.bottom;

        const svg = scatterContainer.append('svg')
          .attr('viewBox', `0 0 ${scatterWidth} ${scatterHeight}`)
          .attr('preserveAspectRatio', 'xMidYMid meet')
          .attr('width', scatterWidth)
          .attr('height', scatterHeight);

        const g = svg.append('g')
          .attr('transform', `translate(${margin.left},${margin.top})`);

        const xValues = featureData.map(d => d[xKey]);
        const yValues = featureData.map(d => d[yKey]);

        const xScale = d3.scaleLinear()
          .domain(d3.extent(xValues)).nice()
          .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
          .domain(d3.extent(yValues)).nice()
          .range([innerHeight, 0]);

        const xAxis = d3.axisBottom(xScale).ticks(8).tickSizeOuter(0);
        const yAxis = d3.axisLeft(yScale).ticks(8).tickSizeOuter(0);

        g.append('g')
          .attr('transform', `translate(0,${innerHeight})`)
          .call(xAxis)
          .call(g => g.select('.domain').remove());

        g.append('g')
          .call(yAxis)
          .call(g => g.select('.domain').remove());

        g.selectAll('.point')
          .data(featureData)
          .join('circle')
          .attr('class', 'scatter-point')
          .attr('cx', d => xScale(d[xKey]))
          .attr('cy', d => yScale(d[yKey]))
          .attr('r', 4)
          .attr('fill', '#72b3ff')
          .attr('opacity', 0.84);

        const regressionLine = linearRegression(featureData, xKey, yKey);
        const linePoints = [
          { x: d3.min(xValues), y: regressionLine.predict(d3.min(xValues)) },
          { x: d3.max(xValues), y: regressionLine.predict(d3.max(xValues)) }
        ];

        g.append('line')
          .attr('class', 'regression-line')
          .attr('x1', xScale(linePoints[0].x))
          .attr('y1', yScale(linePoints[0].y))
          .attr('x2', xScale(linePoints[1].x))
          .attr('y2', yScale(linePoints[1].y));

        svg.append('text')
          .attr('x', margin.left + innerWidth / 2)
          .attr('y', scatterHeight - 12)
          .attr('text-anchor', 'middle')
          .attr('class', 'axis-label')
          .text(xLabel);

        svg.append('text')
          .attr('transform', `translate(18, ${margin.top + innerHeight / 2}) rotate(-90)`)
          .attr('text-anchor', 'middle')
          .attr('class', 'axis-label')
          .text(yLabel);

        scatterContainer.append('div')
          .attr('class', 'scatter-footer')
          .html(`回归线: y = ${regressionLine.slope.toFixed(3)}x + ${regressionLine.intercept.toFixed(3)}`);
      }

      function renderScatterPlaceholder() {
        scatterContainer.selectAll('*').remove();
        scatterTitle.text('请点击矩阵方块查看散点图');
        scatterDescription.text('散点图将在选择变量对后显示。');
      }

      function linearRegression(data, xKey, yKey) {
        const n = data.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;

        data.forEach(d => {
          const x = d[xKey];
          const y = d[yKey];
          sumX += x;
          sumY += y;
          sumXY += x * y;
          sumXX += x * x;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
        const intercept = (sumY - slope * sumX) / n || 0;

        return {
          slope,
          intercept,
          predict: x => slope * x + intercept
        };
      }

      function showTooltip(event, d) {
        const rowLabel = labelMap[d.row] || d.row;
        const colLabel = labelMap[d.col] || d.col;
        tooltip.html(`变量对：<strong>${rowLabel}</strong> vs <strong>${colLabel}</strong><br/>相关系数：<strong>${d.value.toFixed(3)}</strong>`)
          .style('left', `${event.pageX + 14}px`)
          .style('top', `${event.pageY + 14}px`)
          .style('opacity', 1);
      }

      function moveTooltip(event) {
        tooltip.style('left', `${event.pageX + 14}px`)
          .style('top', `${event.pageY + 14}px`);
      }

      function hideTooltip() {
        tooltip.style('opacity', 0);
      }
    })
    .catch(error => {
      heatmapContainer.selectAll('*').remove();
      scatterContainer.selectAll('*').remove();
      heatmapContainer.append('div')
        .attr('class', 'load-error')
        .text('无法加载 CSV 数据，请通过本地 HTTP 服务器打开此页面。');
      scatterContainer.append('div')
        .attr('class', 'load-error')
        .text('若热力图未显示，请先确认已经使用 HTTP 服务打开网页。');
      console.error(error);
    });
})();
