// Overview of the functions represented in this file:

// COLOUR SCALING AND LEGEND:
// 1. renderColourLegend: Generates a color legend indicating the usage frequency of variables in a dataset.

// CONTINGENCY TABLE FUNCTIONS:
// 2. isMissing: Checks if a value is missing or invalid.
// 3. isNumericColumn: Determines if a column in the dataset is numeric.
// 4. combinationCounts: Creates a contingency table for combinations of variables.
// 5. renderCombinationTable: Renders the output of combinationCounts as a table.

// HISTOGRAM FOR NUMERIC VARIABLES:
// 6. renderHistogram: Displays a histogram for a numeric variable, showing the distribution of values.

// RENDER EVERYTHING UPON DATASET SELECTION:
// 7. renderMetadataTable: Displays the metadata table for a selected dataset, including variable usage and contingency tables.

// DATASET SELECTORS

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// This is a colour scale that shows how many papers have used a variable in a dataset. 
function renderColourLegend(high_use_threshold){
  function interp(a,b,t){ return Math.round(a + (b - a) * t);}
  function colourForRatio(r) {
    var rch = interp(255,128,r), gch = interp(255,0,r), bch = interp(0,128,r);
    return 'rgb(' + rch + ',' + gch + ',' + bch + ')';
  }
  
  // Legend container
  var $legend = $('<div id="metadata_legend" style="margin-bottom:8px;"></div>');
  var $row = $('<div style="display:flex; align-items:center;gap:12px;"></div>');

  // Unused variables: no colour
  $row.append($('<span>').text('0:'));
  $row.append($('<span>').css({ display: 'inline-block', width: '28px', height: '16px', border: '1px solid #ccc', background: 'transparent'}));

  // Used variables: 
  for (var i = 1; i <= high_use_threshold; i++) {
    if(i == high_use_threshold) {
      $row.append($('<span>').text(i + '+:'));
      $row.append($('<span>').css({ display: 'inline-block', width: '28px', height: '16px', background: colourForRatio(ratio), border: '1px solid #ccc' })); 
    } else {
      var ratio = Math.min(i/high_use_threshold,1);
      $row.append($('<span>').text(i + ':'));
      $row.append($('<span>').css({ display: 'inline-block', width: '28px', height: '16px', background: colourForRatio(ratio), border: '1px solid #ccc' })); 
    }
  }

  // Formally add to the legend
  $legend.append($row);
  return $legend;
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Functions for creating a contingency table:

// Returns TRUE if the value is missing
function isMissing(val) {
  return val == null || val == '' || val == 'NA' || val == 'N/A' || val == 'na' || val == 'n/a' || (typeof val === 'string' && val.trim().toLowerCase() === 'na');
}

// Determine if a column is numeric
function isNumericColumn(data, col) {
  for (var i = 0; i < data.length; i++) {
    var v = data[i][col];
    if (isMissing(v)) continue;
    if (isNaN(Number(v))) return false;
  }
  return true;
}

// Create a contingency table - Will take any number of variables as input
function combinationCounts(data, variables) {
  if (!Array.isArray(data) || !Array.isArray(variables) || variables.length === 0) return [];

  // determine which variables are numeric
  var numericFlags = variables.map(function (v) { return isNumericColumn(data, v); });

  var map = new Map(); // This'll hold every unique combo
  data.forEach(function (row) {
    var vals = variables.map(function (v, i) {
      var raw = row[v];
      if (numericFlags[i]) {
        return isMissing(raw) ? 'NA' : 'Present';
      } else {
        return isMissing(raw) ? 'NA' : String(raw).trim();
      }
    });

    // join the values with a separator to create a unique key for the combination.
    // Using \x1F as the separator because it's unlikely to be in the data already.
    var key = vals.join('\x1F');
    var entry = map.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      map.set(key, { values: vals, count: 1 });
    }
  });

  var out = [];
  for (var [k, info] of map) {
    var obj = {};
    variables.forEach(function (v, i) { obj[v] = info.values[i]; });
    obj.Count = info.count;
    out.push(obj);
  }

  // sort descending by Count
  out.sort(function (a, b) { return b.Count - a.Count; });
  return out;
}

//Render the output of combinationCounts as a table
function renderCombinationTable(rows, variables) {
  var $table = $('<table class="table table-condensed combination-table" style="width:auto;"></table>');
  var $thead = $('<thead></thead>');
  var $htr = $('<tr></tr>');

  variables.forEach(function (v) { $htr.append($('<th></th>').text(v)); });
  $htr.append($('<th></th>').text('Count'));
  $thead.append($htr);
  $table.append($thead);

  var $tbody = $('<tbody></tbody>');
  rows.forEach(function (r) {
    var $tr = $('<tr></tr>');
    variables.forEach(function (v) { $tr.append($('<td></td>').text(r[v] == null ? '' : r[v])); });
    $tr.append($('<td></td>').text(r.Count));
    $tbody.append($tr);
  });
  $table.append($tbody);
  return $table;
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Create a histogram for a numeric variable
function renderHistogram(data,col,options){
  options = options || {};
  var bins = options.bins || 10;
  var container = options.container || '#histogram_container';
  var title = options.title || ('Histogram of: ' + col);

  if (!Array.isArray(data) || data.length === 0) {
    return $(container).append($('<div>').text('No data'));
  }

  // get all the numeric values for the given column
  var vals = data.map(function (r) { return r[col];})
  .filter(function (v) { return v != null && v !== '' && v !== 'NA' && v !== 'N/A' && !isNaN(Number(v)); })
  .map(function (v) { return Number(v); });

  if(!vals.length) {
    $(container).append($('<div>').text('No numeric data for ' + col));
    return;   
  }

  // Now build the histogram
  var min = Math.min.apply(null, vals);
  var max = Math.max.apply(null, vals);
  if (min === max) {
    $(container).append($('<div>').text('All values are the same for ' + col + ': ' + min));
    return;
  }

  var width = (max - min) / bins;
  var edges = [];
  for (var i = 0; i <= bins; i++) edges.push(min + i * width);

  // count values per bin
  var counts = new Array(bins).fill(0);
  vals.forEach(function (v) {
    var idx = Math.floor((v - min) / width);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    counts[idx]++;
  });

  // labels like "min–edge1", ..., last label shows upper bound
  var labels = [];
  for (var i = 0; i < bins; i++) {
    var left = edges[i], right = edges[i + 1];
    labels.push(left.toFixed(2) + ' – ' + right.toFixed(2));
  }

  // make a canvas; ensure unique id
  var canvasId = 'hist_' + col.replace(/\W+/g, '_');
  $('#' + canvasId).remove();

  // size controls: options.height (px) sets chart height; options.maxHeight enables scrolling
  var canvasHeight = options.height || 300; // default height in px
  var maxWidth = options.maxWidth || '800px';

  var $wrap = $('<div></div>').css({
    marginTop: '12px',
    maxWidth: maxWidth,
    width: '100%',
    height: canvasHeight + 'px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    paddingBottom: '12px'
  });

  $wrap.append($('<h4>').text(title).css({ margin: '0 0 8px 0' }));
  // canvas: set explicit height attribute (px) and let CSS width be 100%
  var $canvas = $('<canvas>')
    .attr('id', canvasId)
    .attr('height', canvasHeight)
    .css({ width: '100%', display: 'block' });
  $wrap.append($canvas);
  $(container).append($wrap);

  function drawChart() {
    var ctx = document.getElementById(canvasId).getContext('2d');
    // destroy existing chart instance if present
    if (window._histCharts === undefined) window._histCharts = {};
    if (window._histCharts[canvasId]) {
      try { window._histCharts[canvasId].destroy(); } catch (e) {}
    }
    window._histCharts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: col,
          data: counts,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        // reserve extra room for tick labels
        layout: { padding: { bottom: 26 } },
        scales: {
          x: {
            ticks: { padding: 6, maxRotation: 45, minRotation: 0, autoSkip: false },
            grid: { display: false }
          },
          y: { beginAtZero: true, title: { display: true, text: 'Count' } }
        },
        plugins: { legend: { display: false }, title: { display: false } }
      }
    });
  }

  // ensure Chart.js is loaded (dynamically)
  if (window.Chart) {
    drawChart();
  } else {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    s.onload = drawChart;
    document.head.appendChild(s);
  }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Show interactive metadata table for a dataset (datasetName should match Data_Name) ~~~~~~~~~
function showMetadataTable(datasetName, high_use_threshold = 5) {
  var row = (window.databaseRecords || []).find(function (r) { return (r.Data_Name || '') === datasetName; });
  if (!row) {
    $('#metadata_container').html('<p>No metadata found for ' + datasetName + '</p>');
    return;
  }

  // and this is looking for the file at the Data_metadata file path
  var metadataPath = row.Data_Metadata || '';
  if (!metadataPath) {
    $('#metadata_container').html('<p>Metadata file missing for ' + datasetName + '</p>');
    return;
  }
  
  // compute counts of variables used by papers for this dataset
  var counts = {};
  (window.databaseRecords || []).forEach(function (r) {
    if ((r.Data_Name || '') === datasetName) {
      var cols = (r.Paper_Metadata_Columns || '').split(';').map(function(s){ return s.trim(); }).filter(Boolean);
      cols.forEach(function (c) { counts[c] = (counts[c] || 0) + 1; });
    }
  });

  // fetch & .then first checks to see if an object exists, and then only proceeds if it does.
  // Quick existence check so you get a clear error rather than a silent Papa.parse failure
  fetch(metadataPath, { method: 'HEAD' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
      // parse and render
      Papa.parse(metadataPath, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (res) {
          var data = res.data || [];
          if (!data.length) {
            $('#metadata_container').html('<p>Metadata file empty or could not be parsed.</p>');
            return;
          }

          // Build table
          var columns = Object.keys(data[0]);
          var $table = $('<table id="metadata_table" class="display" style="width:100%"></table>');
          var $thead = $('<thead></thead>');
          var $tr = $('<tr></tr>');

          columns.forEach(function (col) {
            var count = counts[col] || 0;
            if (count === 0) {
              // columns not used in any papers: leave uncoloured
              $tr.append($('<th></th>').text(col));
            } else {
              // the high use threshold defines the max colour. 
              // If =5, then any variable used 5+ times will be the same colour.
              // Also ensures that all datasets will follow the same colour scheme/scale.
              var ratio = Math.min(count / high_use_threshold, 1);
              function interp(a, b, t) { return Math.round(a + (b - a) * t); }
              var r = interp(255, 128, ratio), g = interp(255, 0, ratio), b = interp(0, 128, ratio);
              var color = 'rgb(' + r + ',' + g + ',' + b + ')';
              $tr.append($('<th></th>').text(col).css({ 'background-color': color, 'color': '#000' }));
            }
          });

          // When you use append like this, it ensures that the $tr is nested into the $thead opener and closer, analogous to: <thead> $tr </thead>
          $thead.append($tr);
          $table.append($thead);

          // Addign the rows
          var $tbody = $('<tbody></tbody>');
          data.forEach(function (row) {
            var $r = $('<tr></tr>');
            columns.forEach(function (col) {
              $r.append($('<td></td>').text(row[col] == null ? '' : row[col]));
            });
            $tbody.append($r);
          });
          $table.append($tbody);

          // Add the legend and table to the container
          var $legend = renderColourLegend(high_use_threshold);
          var $title = $('<div>').text('Number of times each variable has been used as a primary outcome:');
          $('#metadata_container').empty().append($title).append($legend).append('<br>').append($table);

          // initialize DataTables if available
          if ($.fn.dataTable) {
            if ($.fn.dataTable.isDataTable('#metadata_table')) {
              $('#metadata_table').DataTable().destroy();
            }
            $('#metadata_table').DataTable({ pageLength: 10, responsive: true });
          }

          // ADD VARIABLE COUNT SUMMARY BELOW MAIN METADATA TABLE
          // sort variable counts from biggest to smallest
          var sortedCounts = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; });
          console.log('Sorted variable counts for dataset', datasetName, sortedCounts);
          // display sortedCounts as a table
          var $counttable = $('<table id="metadata_table" class="display" style="width:100%"></table>');
          var $countthead = $('<thead></thead>');
          var $counttr = $('<tr></tr>');
          $counttr.append($('<th></th>').text('Variable'));
          $counttr.append($('<th></th>').text('Count'));
          $countthead.append($counttr);
          $counttable.append($countthead);
          var $counttbody = $('<tbody></tbody>');
          sortedCounts.forEach(function (entry) {
            var $r = $('<tr></tr>');
            $r.append($('<td></td>').text(entry[0]));
            $r.append($('<td></td>').text(entry[1]));
            $counttbody.append($r);
          });
          $counttable.append($counttbody);

          var countTitle = $('<div>').html("<h4>Variable usage summary:</h4>");
          $('#metadata_container').append("<br>").append(countTitle).append($counttable);

          // initialize DataTables for the counts table if needed
         if ($.fn.dataTable) {
           if ($.fn.dataTable.isDataTable('#variable_counts_table')) {
             $('#variable_counts_table').DataTable().destroy();
           }
           $('#variable_counts_table').DataTable({ pageLength: 10, responsive: true, searching: false });
         }

         // Add in the contingency table
         // Use two example variables for now - EDIT SO THAT IT USES HTML SELECTORS
         var contTable = combinationCounts(data, ['age_years','city']);
         var contTitle = $('<div>').html("<h4>Contingency Table:</h4>");
         $('#metadata_container').append("<br>").append(contTitle).append(renderCombinationTable(contTable, ['age_years','city']));

         // render histogram for numeric column "age_years" - AGAIN, JUST USING AGE AS A PLACEHOLDER
         renderHistogram(data, 'age_years', { bins: 12, container: '#metadata_container', title: 'Age (years)' });
        },
        error: function (err) {
          $('#metadata_container').html('<p>Error parsing metadata: ' + String(err) + '</p>');
        }
      });
    })
    .catch(function (err) {
      console.error('Metadata fetch error for', metadataPath, err);
      $('#metadata_container').html('<p>Error loading metadata at <code>' + metadataPath + '</code>: ' + String(err) + '</p>');
    });

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Dataset selectors
(function () {
  function populate() {
    var recs = window.databaseRecords || [];
    if (!recs.length) return false;
    var seen = new Set();
    var $sel = $('#dataset_select');
    $sel.find('option:not([value=""])').remove();
    recs.forEach(function (r) {
      var name = r.Data_Name || '';
      if (name && !seen.has(name)) {
        $sel.append($('<option>').val(name).text(name));
        seen.add(name);
      }
    });
    return true;
  }

  $(function () {
    // Try immediately; if not ready, try again in a few secs (max ~5s)
    if (!populate()) {
      var tries = 0;
      var maxTries = 50;
      var t = setInterval(function () {
        if (populate() || ++tries >= maxTries) clearInterval(t);
      }, 100);
    }

    $('#show_metadata_btn').on('click', function () {
      var ds = $('#dataset_select').val();
      if (!ds) { alert('Please select a dataset'); return; }
      if (typeof showMetadataTable === 'function') {
        showMetadataTable(ds);
      } else {
        alert('Metadata helper not loaded yet.');
      }
    });
  });
})();