
const width = 550, height = 670;
const svg = d3.select("#map-svg")
  .attr("width", width)
  .attr("height", height);

// Add a background rectangle for the sea (light blue)
svg.insert("rect", ":first-child")
  .attr("width", width)
  .attr("height", height)
  .attr("fill", "lightskyblue");

// Use Mercator projection optimized for our area
const projection = d3.geoMercator()
  .center([-2.5, 37.9])
  .scale(2000)
  .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// Create tooltip element
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Function to show the line chart in a modal
const drawLineChart = (data, parameter) => {
  // Remove any existing modal
  d3.select("#chart-modal").remove();

  // Create a modal container
  const modal = d3.select("body")
    .append("div")
    .attr("id", "chart-modal");

  // Add a Close button
  modal.append("button")
    .text("Close")
    .on("click", () => modal.remove());

  // Set chart dimensions
  const chartWidth = 1400;
  const chartHeight = 700;
  const margin = { top: 50, right: 150, bottom: 100, left: 80 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // Time parser
  const timeParser = d3.timeParse("%Y-%m-%d %H:%M:%S.%L");

  // Parse and filter data
  const parsedData = data
    .map(d => {
      const date = timeParser(d["Unnamed: 0"]);
      return {
        parsedTime: date,
        value: +d[parameter],
        target: d.target,
        prediction: d.prediction
      };
    })
    .filter(d => d.parsedTime && d.parsedTime >= new Date("2019-01-01") && d.parsedTime < new Date("2022-01-01"))
    .sort((a, b) => a.parsedTime - b.parsedTime);

  if (!parsedData.length) return;

  // Create the main SVG and group
  const chartSvg = modal.append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const g = chartSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Define scales
  const [minTime, maxTime] = d3.extent(parsedData, d => d.parsedTime);
  const xScale = d3.scaleTime()
    .domain([minTime, maxTime])
    .range([0, innerWidth]);

  const [minVal, maxVal] = d3.extent(parsedData, d => d.value);
  const yScale = d3.scaleLinear()
    .domain([minVal, maxVal])
    .range([innerHeight, 0]);

  // Draw lighter grey line segments for "no prediction"
  for (let i = 0; i < parsedData.length - 1; i++) {
    const start = parsedData[i];
    const end = parsedData[i + 1];

    if (!start.prediction || start.prediction === "") {
      g.append("line")
        .attr("x1", xScale(start.parsedTime))
        .attr("y1", yScale(start.value))
        .attr("x2", xScale(end.parsedTime))
        .attr("y2", yScale(end.value))
        .attr("stroke", "#ccc")
        .attr("stroke-width", 2);
    }
  }

  // Distinguish false positives vs. false negatives, etc., with different greens
  g.selectAll(".colored-marker")
    .data(parsedData.filter(d => d.prediction && d.prediction !== ""))
    .enter()
    .append("circle")
    .attr("class", "colored-marker")
    .attr("cx", d => xScale(d.parsedTime))
    .attr("cy", d => yScale(d.value))
    .attr("r", 3)
    .attr("fill", d => {
      const targetNum = Number(d.target);
      const predNum = Number(d.prediction);

      if (!isNaN(targetNum) && !isNaN(predNum)) {
        const bothOne = targetNum === 1 && predNum === 1;
        const bothZero = targetNum === 0 && predNum === 0;
        if (bothOne) {
          return "lightgreen"; // True positive
        } else if (bothZero) {
          return "darkgreen";  // True negative
        } else if (targetNum === 0 && predNum === 1) {
          return "orange";     // False positive
        } else if (targetNum === 1 && predNum === 0) {
          return "red";        // False negative
        } else {
          return "red";        // Other mismatch
        }
      }
      return "red";
    })
    .style("opacity", 1);

  // X-axis
  const xAxis = d3.axisBottom(xScale)
    .tickValues(d3.timeMonth.range(minTime, maxTime).concat([minTime, maxTime]))
    .tickFormat(d3.timeFormat("%Y-%m-%d"));

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  // Y-axis
  g.append("g")
    .call(d3.axisLeft(yScale).ticks(10).tickFormat(d3.format(".3f")));

  // Chart titles
  chartSvg.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .attr("font-weight", "bold")
    .text(`${parameter} Over Time`);

  chartSvg.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight - 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Time (Year-Month-Day)");

  chartSvg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -chartHeight / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text(parameter);

  // Add quick legend
  const legendItems = [
    { label: "True Positive", color: "lightgreen" },
    { label: "True Negative", color: "darkgreen" },
    { label: "False Positive", color: "orange" },
    { label: "False Negative", color: "red" },
    { label: "No Prediction", color: "gray" }
  ];

  const legendGroup = chartSvg.append("g")
    .attr("transform", `translate(${chartWidth - 120}, ${margin.top})`);

  legendItems.forEach((item, i) => {
    const row = legendGroup.append("g").attr("transform", `translate(0, ${i * 20})`);
    row.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", item.color);

    row.append("text")
      .attr("x", 20)
      .attr("y", 10)
      .attr("fill", item.color)
      .style("font-size", "12px")
      .text(item.label);
  });
};

const drawScatterPlot2 = data => {
  // Remove any existing modal
  d3.select("#chart-modal").remove();

  const modal = d3.select("body")
    .append("div")
    .attr("id", "chart-modal");

  modal.append("button")
    .text("Close")
    .on("click", () => modal.remove());

  const chartWidth = 600,
        chartHeight = 300; 
  const margin = { top: 40, right: 20, bottom: 70, left: 60 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const chartSvg = modal.append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const g = chartSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // X-scale
  const xScale = d3.scaleLinear()
    .domain([d3.min(data, d => +d.swvl1_era5land), d3.max(data, d => +d.swvl1_era5land)])
    .range([0, innerWidth]);

  // Y-scale
  const yScale = d3.scaleLinear()
    .domain([d3.min(data, d => +d.backscatter40), d3.max(data, d => +d.backscatter40)])
    .range([innerHeight, 0]);

  // Circles
  g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(+d.swvl1_era5land))
    .attr("cy", d => yScale(+d.backscatter40))
    // Start radius at 0 for small pop animation
    .attr("r", 0)
    .attr("fill", d => {
      if (!d.prediction) {
        return "gray";
      }
      // Compare numeric values (e.g. 1 and 1.0 are the same)
      const targetNum = parseFloat(d.target);
      const predNum = parseFloat(d.prediction);
      return (targetNum === predNum) ? "#2ecc71" : "#e74c3c";
    })
    .attr("stroke", d => {
      if (!d.prediction) {
        return "gray";
      }
      const targetNum = parseFloat(d.target);
      const predNum = parseFloat(d.prediction);
      return (targetNum === predNum) ? "#2ecc71" : "#e74c3c";
    })
    .attr("stroke-width", 1.8)
    .style("opacity", d => (!d.prediction ? 0.2 : 0.9))
    .transition()
    .duration(700)
    .attr("r", 3);

  // Axes
  const xAxis = d3.axisBottom(xScale).ticks(10);
  const yAxis = d3.axisLeft(yScale).ticks(10).tickFormat(d3.format(".3f"));

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis);

  g.append("g")
    .call(yAxis);

  // Chart title
  chartSvg.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text(`Scatter Plot of swvl1_era5land vs backscatter40`);

  // X-axis label
  chartSvg.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight - 10)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("swvl1_era5land");

  // Y-axis label
  chartSvg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -chartHeight / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text("backscatter40");

  // Calculate and draw best fit line
  const xMean = d3.mean(data, d => +d.swvl1_era5land);
  const yMean = d3.mean(data, d => +d.backscatter40);
  const numerator = d3.sum(data, d => (+d.swvl1_era5land - xMean) * (+d.backscatter40 - yMean));
  const denominator = d3.sum(data, d => Math.pow(+d.swvl1_era5land - xMean, 2));
  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  const bestFitLine = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y));

  const lineData = [
    { x: d3.min(data, d => +d.swvl1_era5land), y: slope * d3.min(data, d => +d.swvl1_era5land) + intercept },
    { x: d3.max(data, d => +d.swvl1_era5land), y: slope * d3.max(data, d => +d.swvl1_era5land) + intercept }
  ];

  g.append("path")
    .datum(lineData)
    .attr("fill", "none")
    .attr("stroke", "blue")
    .attr("stroke-width", 1.5)
    .attr("d", bestFitLine);
};


const drawCombinedTimeSeriesPlot = (data) => {
  // Remove any existing modal
  d3.select("#chart-modal").remove();
  const modal = d3.select("body")
    .append("div")
    .attr("id", "chart-modal");

  modal.append("button")
    .text("Close")
    .on("click", () => modal.remove());

  // Set chart dimensions
  const chartWidth = 1400;
  const chartHeight = 700;
  const margin = { top: 50, right: 180, bottom: 100, left: 150 }; 
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // Time parser
  const timeParser = d3.timeParse("%Y-%m-%d %H:%M:%S.%L");

  // Create a new array of parsed objects (including ERA5)
  const parsedData = data
    .map(d => {
      const date = timeParser(d["Unnamed: 0"]);
      return {
        parsedTime: date,
        slope40: +d.slope40,
        curvature40: +d.curvature40,
        backscatter40: +d.backscatter40,
        swvl1_era5land: +d.swvl1_era5land, 
        target: d.target,
        prediction: d.prediction
      };
    })
    .filter(d => d.parsedTime && d.parsedTime >= new Date("2020-06-01") && d.parsedTime < new Date("2021-01-01"))
    .sort((a, b) => a.parsedTime - b.parsedTime);

  if (!parsedData.length) return;

  // Collect all values
  const allValues = [];
  parsedData.forEach(d => {
    allValues.push(d.slope40, d.curvature40, d.backscatter40, d.swvl1_era5land);
  });
  const minVal = d3.min(allValues);
  const maxVal = d3.max(allValues);
  const yPadding = 0.05 * (maxVal - minVal);

  // Create SVG
  const chartSvg = modal.append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const g = chartSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Define x-scale
  const [minTime, maxTime] = d3.extent(parsedData, d => d.parsedTime);
  const xScale = d3.scaleTime()
    .domain([minTime, maxTime])
    .range([0, innerWidth]);

  // Base y-scale
  const yScale = d3.scaleLinear()
    .domain([minVal - yPadding, maxVal + yPadding])
    .range([innerHeight, 0]);

  // Color map (add black for ERA5)
  const lineColors = {
    slope40: "steelblue",
    curvature40: "orange",
    backscatter40: "#d81b60",
    swvl1_era5land: "black"
  };

  // Add ERA5 key
  const paramKeys = ["slope40", "curvature40", "backscatter40", "swvl1_era5land"];
  const yScales = {};
  const yAxes = {};

  // Create an individual scale and axis for each parameter
  paramKeys.forEach((param, i) => {
    const values = parsedData.map(d => d[param]);
    const localMin = d3.min(values);
    const localMax = d3.max(values);
    const localPadding = 0.05 * (localMax - localMin);

    yScales[param] = d3.scaleLinear()
      .domain([localMin - localPadding, localMax + localPadding])
      .range([innerHeight, 0]);

    // Axes on different sides
    if (i === 0) {
      // Left axis
      yAxes[param] = g.append("g")
        .call(d3.axisLeft(yScales[param]).ticks(5).tickFormat(d3.format(".3f")));

      yAxes[param].selectAll("path, line").attr("stroke", lineColors[param]);
      yAxes[param].selectAll("text").attr("fill", lineColors[param]);

      yAxes[param]
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("fill", lineColors[param])
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(param);
    } else if (i === 1) {
      // Right axis
      yAxes[param] = g.append("g")
        .attr("transform", `translate(${innerWidth},0)`)
        .call(d3.axisRight(yScales[param]).ticks(5).tickFormat(d3.format(".3f")));

      yAxes[param].selectAll("path, line").attr("stroke", lineColors[param]);
      yAxes[param].selectAll("text").attr("fill", lineColors[param]);

      yAxes[param]
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", 50)
        .attr("fill", lineColors[param])
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(param);
    } else if (i === 2) {
      // Third axis
      yAxes[param] = g.append("g")
        .attr("transform", `translate(${innerWidth + 60},0)`)
        .call(d3.axisRight(yScales[param]).ticks(5).tickFormat(d3.format(".3f")));

      yAxes[param].selectAll("path, line").attr("stroke", lineColors[param]);
      yAxes[param].selectAll("text").attr("fill", lineColors[param]);

      yAxes[param]
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", 50)
        .attr("fill", lineColors[param])
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(param);
    } else {
      // Fourth axis offset further for ERA5
      yAxes[param] = g.append("g")
        .attr("transform", `translate(${innerWidth + 120},0)`)
        .call(d3.axisRight(yScales[param]).ticks(5).tickFormat(d3.format(".3f")));

      yAxes[param].selectAll("path, line").attr("stroke", lineColors[param]);
      yAxes[param].selectAll("text").attr("fill", lineColors[param]);

      yAxes[param]
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", 50)
        .attr("fill", lineColors[param])
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(param);
    }
  });

  // Draw line segments
  paramKeys.forEach(param => {
    for (let i = 0; i < parsedData.length - 1; i++) {
      const start = parsedData[i];
      const end = parsedData[i + 1];

      g.append("line")
        .attr("x1", xScale(start.parsedTime))
        .attr("y1", yScales[param](start[param]))
        .attr("x2", xScale(end.parsedTime))
        .attr("y2", yScales[param](end[param]))
        .attr("stroke", lineColors[param])
        .attr("stroke-width", param === "backscatter40" ? 1.5 : 3);

      // Markers only for backscatter40
      if (param === "backscatter40" && start.prediction && start.prediction !== "") {
        const targetNum = Number(start.target);
        const predNum = Number(start.prediction);

        let markerColor = "gray";
        if (!isNaN(targetNum) && !isNaN(predNum)) {
          if (targetNum === 1 && predNum === 1) {
            markerColor = "lightgreen"; // True positive
          } else if (targetNum === 0 && predNum === 0) {
            markerColor = "darkgreen";  // True negative
          } else if (targetNum === 0 && predNum === 1) {
            markerColor = "orange";     // False positive
          } else if (targetNum === 1 && predNum === 0) {
            markerColor = "red";        // False negative
          }
        }

        g.append("circle")
          .attr("cx", xScale(start.parsedTime))
          .attr("cy", yScales[param](start[param]))
          .attr("r", 3)
          .attr("fill", markerColor);
      }
    }
  });

  // Add a legend for the colors
  const legendItems = [
    { label: "True Positive", color: "lightgreen" },
    { label: "True Negative", color: "darkgreen" },
    { label: "False Positive", color: "orange" },
    { label: "False Negative", color: "red" },
  ];

  const legendGroup = chartSvg.append("g")
    .attr("transform", `translate(20, ${margin.top})`);

  legendItems.forEach((item, i) => {
    const row = legendGroup.append("g").attr("transform", `translate(0, ${i * 20})`);
    row.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", item.color);

    row.append("text")
      .attr("x", 20)
      .attr("y", 10)
      .attr("fill", item.color)
      .style("font-size", "12px")
      .text(item.label);
  });

  // Shared X-axis
  const xAxis = d3.axisBottom(xScale)
    .tickValues(d3.timeMonth.range(minTime, maxTime).concat([minTime, maxTime]))
    .tickFormat(d3.timeFormat("%Y-%m-%d"));

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  // Chart title
  chartSvg.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .attr("font-weight", "bold")
    .text("Backscatter, Slope, Curvature, & ERA5 Soil Moisture Over Time");

  chartSvg.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight - 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Time (Year-Month-Day)");
};

// Function to show the scatter plot in a modal
const drawScatterPlot = (data) => {
  // Remove any existing modal
  d3.select("#chart-modal").remove();

  // Create a modal container
  const modal = d3.select("body")
    .append("div")
    .attr("id", "chart-modal");

  // Add a Close button
  modal.append("button")
    .text("Close")
    .on("click", () => modal.remove());

  // Set chart dimensions
  const chartWidth = 1400;
  const chartHeight = 700;
  const margin = { top: 50, right: 120, bottom: 100, left: 150 }; 
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // Time parser
  const timeParser = d3.timeParse("%Y-%m-%d %H:%M:%S.%L");

  // Create a new array of parsed objects
  const parsedData = data
    .map(d => {
      const date = timeParser(d["Unnamed: 0"]);
      return {
        parsedTime: date,
        curvature40: +d.curvature40,
        curvature40_rolling_mean_60days: +d.curvature40_rolling_mean_60days,
        difference_of_curvature40: +d.difference_of_curvature40,
        target: d.target,
        prediction: d.prediction
      };
    })
    .filter(d => d.parsedTime && d.parsedTime >= new Date("2019-01-01") && d.parsedTime < new Date("2022-01-01"))
    .sort((a, b) => a.parsedTime - b.parsedTime);

  if (!parsedData.length) return;

  // Collect all values
  const allValues = [];
  parsedData.forEach(d => {
    allValues.push(d.curvature40, d.curvature40_rolling_mean_60days, d.difference_of_curvature40);
  });
  const minVal = d3.min(allValues);
  const maxVal = d3.max(allValues);
  const yPadding = 0.05 * (maxVal - minVal);

  // Create SVG
  const chartSvg = modal.append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const g = chartSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Define x-scale
  const [minTime, maxTime] = d3.extent(parsedData, d => d.parsedTime);
  const xScale = d3.scaleTime()
    .domain([minTime, maxTime])
    .range([0, innerWidth]);

  // Base y-scale
  const yScale = d3.scaleLinear()
    .domain([minVal - yPadding, maxVal + yPadding])
    .range([innerHeight, 0]);

  // Color map
  const lineColors = {
    curvature40: "steelblue",
    curvature40_rolling_mean_60days: "orange",
    difference_of_curvature40: "#d81b60" 
  };

  const paramKeys = ["curvature40", "curvature40_rolling_mean_60days", "difference_of_curvature40"];
  const yScales = {};
  const yAxes = {};

  // Create an individual scale and axis for each parameter
  paramKeys.forEach((param, i) => {
    const values = parsedData.map(d => d[param]);
    const localMin = d3.min(values);
    const localMax = d3.max(values);
    const localPadding = 0.05 * (localMax - localMin);

    yScales[param] = d3.scaleLinear()
      .domain([localMin - localPadding, localMax + localPadding])
      .range([innerHeight, 0]);

    if (i === 0) {
      // Left axis
      yAxes[param] = g.append("g")
        .call(d3.axisLeft(yScales[param]).ticks(5).tickFormat(d3.format(".3f")));

      yAxes[param].selectAll("path, line").attr("stroke", lineColors[param]);
      yAxes[param].selectAll("text").attr("fill", lineColors[param]);

      yAxes[param]
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -50) 
        .attr("fill", lineColors[param])
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(param);

    } else if (i === 1) {
      // Right axis
      yAxes[param] = g.append("g")
        .attr("transform", `translate(${innerWidth},0)`)
        .call(d3.axisRight(yScales[param]).ticks(5).tickFormat(d3.format(".3f")));

      yAxes[param].selectAll("path, line").attr("stroke", lineColors[param]);
      yAxes[param].selectAll("text").attr("fill", lineColors[param]);

      yAxes[param]
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", 50)
        .attr("fill", lineColors[param])
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(param);

    } else {
      // Third axis, offset further
      yAxes[param] = g.append("g")
        .attr("transform", `translate(${innerWidth + 60},0)`)
        .call(d3.axisRight(yScales[param]).ticks(5).tickFormat(d3.format(".3f")));

      yAxes[param].selectAll("path, line").attr("stroke", lineColors[param]);
      yAxes[param].selectAll("text").attr("fill", lineColors[param]);

      yAxes[param]
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", 50)
        .attr("fill", lineColors[param])
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(param);
    }
  });

  // Draw line segments and add markers only for difference_of_curvature40
  paramKeys.forEach(param => {
    for (let i = 0; i < parsedData.length - 1; i++) {
      const start = parsedData[i];
      const end = parsedData[i + 1];

      // Default color is the param color
      let segmentColor = lineColors[param];

      // Draw line segment
      g.append("line")
        .attr("x1", xScale(start.parsedTime))
        .attr("y1", yScales[param](start[param]))
        .attr("x2", xScale(end.parsedTime))
        .attr("y2", yScales[param](end[param]))
        .attr("stroke", segmentColor)
        .attr("stroke-width", param === "difference_of_curvature40" ? 1.5 : 3); 

      // Add markers only for difference_of_curvature40
      if (param === "difference_of_curvature40" && start.prediction && start.prediction !== "") {
        const targetNum = Number(start.target);
        const predNum = Number(start.prediction);

        let markerColor = "gray"; // Default color for no prediction
        if (!isNaN(targetNum) && !isNaN(predNum)) {
          if (targetNum === 1 && predNum === 1) {
            markerColor = "lightgreen"; // True positive
          } else if (targetNum === 0 && predNum === 0) {
            markerColor = "darkgreen"; // True negative
          } else if (targetNum === 0 && predNum === 1) {
            markerColor = "orange"; // False positive
          } else if (targetNum === 1 && predNum === 0) {
            markerColor = "red"; // False negative
          }
        }

        g.append("circle")
          .attr("cx", xScale(start.parsedTime))
          .attr("cy", yScales[param](start[param]))
          .attr("r", 3)
          .attr("fill", markerColor);
      }
    }
  });

  // Add a legend for the colors
  const legendItems = [
    { label: "True Positive", color: "lightgreen" },
    { label: "True Negative", color: "darkgreen" },
    { label: "False Positive", color: "orange" },
    { label: "False Negative", color: "red" },
  ];

  const legendGroup = chartSvg.append("g")
    .attr("transform", `translate(20, ${margin.top})`); 

  legendItems.forEach((item, i) => {
    const row = legendGroup.append("g").attr("transform", `translate(0, ${i * 20})`);
    row.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", item.color);

    row.append("text")
      .attr("x", 20)
      .attr("y", 10)
      .attr("fill", item.color)
      .style("font-size", "12px")
      .text(item.label);
  });

  // Shared X-axis
  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeMonth.every(1))
    .tickFormat(d3.timeFormat("%Y-%m-%d"));

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  // Chart title
  chartSvg.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .attr("font-weight", "bold")
    .text("Curvature40, Rolling Mean (60d), and Difference Over Time");

  chartSvg.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight - 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Time (Year-Month-Day)");
};

// Cache for loaded datasets
const dataCache = {};

// Function to load and draw the map with the specified dataset
const loadMap = (dataset) => {
  d3.selectAll("svg > *").remove(); 

  svg.insert("rect", ":first-child")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "lightskyblue");

  const spinnerContainer = d3.select(".spinner-container");
  spinnerContainer.style("display", "block");

  if (dataCache[dataset]) {
    drawMap(dataCache[dataset], dataset);
    spinnerContainer.style("display", "none");
  } else {
    Promise.all([
      d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
      d3.csv(dataset, d => ({
        ...d,
        lon: +d.lon,
        lat: +d.lat,
        percentage_match: +d.percentage_match,
        soil_cat: d.soil_cat
      }))
    ]).then(([geojson, data]) => {
      // Group data by gpi_ascat
      const groupedData = d3.group(data, d => d.gpi_ascat);
      dataCache[dataset] = { geojson, groupedData };
      drawMap(dataCache[dataset], dataset);
      spinnerContainer.style("display", "none");
    }).catch(error => {
      console.error("Error loading data:", error);
      spinnerContainer.style("display", "none");
    });
  }
};

const drawMap = ({ geojson, groupedData }, dataset) => {
  svg.append("g")
    .selectAll("path")
    .data(geojson.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "lightgray")
    .attr("stroke", "white");

  // Define color scales
  const percentageColorScale = d3.scaleLinear()
    .domain([50, 100]) 
    .range(["yellow", "green"]); 

  const soilCatColors = {
    mixed: "red",
    wet: "blue",
    dry: "yellow",
    unknown: "gray"
  };

  // Determine which color scale to use
  const isBaseline = dataset === "ascat_baseline.csv" || dataset === "ascat_roll15.csv" || dataset === "ascat_roll30.csv" || dataset === "ascat_roll60.csv" || dataset === "ascat_diff.csv" || dataset === "ascat_diff_diff.csv";

  svg.selectAll("circle")
    .data(Array.from(groupedData.values()))
    .enter()
    .append("circle")
    .attr("cx", d => projection([d[0].lon, d[0].lat])[0])
    .attr("cy", d => projection([d[0].lon, d[0].lat])[1])
    .attr("r", 2.7)
    .attr("fill", d => isBaseline
      ? percentageColorScale(+d[0].percentage_match) 
      : soilCatColors[d[0].soil_cat] || "gray" 
    )
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(isBaseline
        ? `lon: ${d[0].lon}<br>lat: ${d[0].lat}<br>percentage_match: ${d[0].percentage_match}%`
        : `lon: ${d[0].lon}<br>lat: ${d[0].lat}<br>soil_cat: ${d[0].soil_cat}`
      )
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .on("click", (event, d) => {
      const chartType = document.getElementById("chart-type-select").value;
      if (chartType === "line") {
          const parameter = document.getElementById("parameter-select").value;
          drawLineChart(d, parameter);
      } else if (chartType === "scatter") {
          drawScatterPlot(d);
        } else if (chartType === "scatter2") {
          drawScatterPlot2(d);
      } else if (chartType === "combined") { 
          drawCombinedTimeSeriesPlot(d);
      }
  });

  // Remove any existing legend
  d3.select(".legend").remove();

  // Add legend outside the map box
  const legend = d3.select("#map-container").append("div")
    .attr("class", "legend")
    .style("position", "absolute")
    .style("bottom", "20px")
    .style("right", "40px")
    .style("background", "white")
    .style("padding", "10px")
    .style("border", "2px solid #ccc")
    .style("border-radius", "10px");

  // Add the appropriate legend based on the dataset
  legend.html(isBaseline
    ? `<strong>Percentage Match</strong><br>
       <div style="display: flex; align-items: center;">
         <div style="width: 20px; height: 10px; background: yellow; margin-right: 5px;"></div> 50%
       </div>
       <div style="display: flex; align-items: center;">
         <div style="width: 20px; height: 10px; background: green; margin-right: 5px;"></div> 100%
       </div>`
    : `<strong>Soil Categories</strong><br>
       ${Object.entries(soilCatColors).map(([cat, color]) => `
         <div style="display: flex; align-items: center;">
           <div style="width: 20px; height: 10px; background: ${color}; margin-right: 5px;"></div> ${cat}
         </div>`).join("")}`
  );
};
// Load the default map on page load
loadMap("ascat_soil_categories.csv");

// Add event listeners for the tabs
document.getElementById("default-tab").addEventListener("click", () => loadMap("ascat_soil_categories.csv"));
document.getElementById("cell-1250-tab").addEventListener("click", () => {
  // Show the filters for "Select Parameter" and "Select Chart Type"
  document.querySelector(".sidebar").style.display = "block";

  // Get the selected CSV file from the dropdown
  const csvSelect = document.getElementById("csv-select");
  const selectedCsv = csvSelect.value;

  // Load the selected CSV file
  loadMap(selectedCsv);

  // Add an event listener to the dropdown to reload the map when the selection changes
  csvSelect.addEventListener("change", () => {
    const newSelectedCsv = csvSelect.value;
    loadMap(newSelectedCsv);
  });
});

// Hide the filters for other tabs
const tabs = [
  "default-tab",
  "baseline-tab",
  "roll15-tab",
  "roll30-tab",
  "roll60-tab",
  "diff-tab",
  "diff-diff-tab"
];

tabs.forEach(tabId => {
  document.getElementById(tabId).addEventListener("click", () => {
    // Hide the filters for "Select Parameter" and "Select Chart Type"
    document.querySelector(".sidebar").style.display = "none";
  });
});
document.getElementById("baseline-tab").addEventListener("click", () => loadMap("ascat_baseline.csv"));
document.getElementById("roll15-tab").addEventListener("click", () => loadMap("ascat_roll15.csv"));
document.getElementById("roll30-tab").addEventListener("click", () => loadMap("ascat_roll30.csv"));
document.getElementById("roll60-tab").addEventListener("click", () => loadMap("ascat_roll60.csv"));
document.getElementById("diff-tab").addEventListener("click", () => loadMap("ascat_diff.csv"));
document.getElementById("diff-diff-tab").addEventListener("click", () => loadMap("ascat_diff_diff.csv"));
