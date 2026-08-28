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
  var $table = $('<table id="comb_table" class="table table-condensed combination-table" style="width:auto;"></table>');
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
  options = options || {}; // default to empty object if not provided
  var bins = options.bins || 10;
  var container = options.container || '#output_histogram';
  var title = options.title || ('Histogram of: ' + col);

  if (!Array.isArray(data) || data.length === 0) {
    return $(container).append($('<div>').text('No data')); // empty removed
  }

  // get all the numeric values for the given column
  var vals = data.map(function (r) { return r[col];})
  .filter(function (v) { return v != null && v !== '' && v !== 'NA' && v !== 'N/A' && !isNaN(Number(v)); })
  .map(function (v) { return Number(v); });

  if(!vals.length) {
    $(container).append($('<div>').text('No numeric data for ' + col)); // empty removed
    return;   
  }

  // Now build the histogram
  var min = Math.min.apply(null, vals);
  var max = Math.max.apply(null, vals);
  if (min === max) {
    $(container).append($('<div>').text('All values are the same for ' + col + ': ' + min)); // empty removed
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
    id: 'histogram',
    marginTop: '12px',
    maxWidth: maxWidth,
    width: '100%',
    height: canvasHeight + 'px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    paddingBottom: '12px'
  });

  $wrap.append($('<h4>').text(title).css({ margin: '0 0 8px 0', color: '#fff' }));

  // canvas: set explicit height attribute (px) and let CSS width be 100%
  var $canvas = $('<canvas>')
    .attr('id', canvasId)
    .attr('height', canvasHeight)
    .css({ width: '100%', display: 'block' });
  $wrap.append($canvas);

  // Add wrap to container
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
            ticks: { color: '#fff', padding: 6, maxRotation: 45, minRotation: 0, autoSkip: false },
            grid: { display: false }
          },
          y: { beginAtZero: true, title: { display: true, text: 'Count' }, ticks: { color: '#fff' } }
        },
        plugins: { legend: { display: false, labels: { color: '#fff' } }, 
                    title: { display: false, color: '#fff' } }
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
// Load a dataset (datasetName should match Data_Name) ~~~~~~~~~
function showMetadataTable(datasetName, high_use_threshold = 5) {
  var row = (window.databaseRecords || []).find(function (r) { return (r.Data_Name || '') === datasetName; });
  if (!row) {
    $('#output_table').html('<p>No metadata found for ' + datasetName + '</p>');
    return;
  }

  // any special notes on how the dataset should be processed?
  var notes = row.Data_Usage_Notes || '';
  $('#dataset_overview').empty(); // clear previous notes
  console.log('Usage notes for', datasetName, notes);
  if (notes) {
    $('#dataset_overview').append("<h4>Dataset Usage Notes:</h4>").append($('<p>').text(notes));
  }

  // and this is looking for the file at the Data_metadata file path
  var metadataPath = row.Data_Metadata || '';
  if (!metadataPath) {
    $('#output_table').html('<p>Metadata file missing for ' + datasetName + '</p>');
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
            $('#output_table').html('<p>Metadata file empty or could not be parsed.</p>');
            return;
          }


          // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          // OUTPUT_TABLE ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          var columns = Object.keys(data[0]);
          // expose variable output for handlers outside this scope
          window._metadata_current = { data: data, columns: Object.keys(data[0] || {}), counts: counts };
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

          // Add the legend and table to the HTML container
          var $title = $('<div>').html("<h4>Metadata Table:</h4>");
          var $legend = renderColourLegend(high_use_threshold);
          var $legendtitle = $('<div>').text('Number of times each variable has been used as a primary outcome:');
          $('#output_table').empty().append($title).append($legendtitle).append($legend).append('<br>').append($table);

          // Use DataTables to make the table pretty
          // (Note that it's using the table's ID to modify the table (metadata_table), NOT the div container name (output_table) to append a new HTML element)
          if ($.fn.dataTable) {
            if ($.fn.dataTable.isDataTable('#metadata_table')) {
              $('#metadata_table').DataTable().destroy();
            }
            $('#metadata_table').DataTable({ pageLength: 10, responsive: true });
          }

          // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          // OUTPUT_SUMMARY ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

          // sort variable counts from biggest to smallest
          var sortedCounts = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; });
          console.log('Sorted variable counts for dataset:', datasetName, sortedCounts);
          // display sortedCounts as a table
          var $counttable = $('<table id="output_summary_table" class="display" style="width:100%"></table>');
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

          // Add it to the HTML container
          var countTitle = $('<div>').html("<h4>Variable usage summary:</h4>");
          // Remember to use .empty() first in order to remove any previously-generated tables!
          $('#output_summary').empty().append("<br>").append(countTitle).append($counttable);

          // Make this table pretty, too
          if ($.fn.dataTable) {
            if ($.fn.dataTable.isDataTable('#output_summary_table')) {
              $('#output_summary_table').DataTable().destroy();
            }
            $('#output_summary_table').DataTable({ pageLength: 10, responsive: true, searching: false, order: [[1, 'desc']] });
          }

          // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          // OUTPUT_CONTINGENCY ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          var infotext = "Numeric variables will be counted as present (not NA) or absent (NA value).\nIf numbers show up as characters, check the dataset - one or more of the data points may be stored as text.";
          var contTitle = $('<div>').html("<h4>Contingency Table: <i class='fa fa-info-circle' data-toggle='tooltip' data-html='true' title='" + infotext + "'></i></h4>");

          // PART 1: Done before selecting any variables
          // Create an empty HTML selector
          var chooser = document.createElement('select');
               chooser.className = "selectpicker";
               chooser.id = "chooser_contingency";
               chooser.multiple = true;
               chooser.setAttribute("data-live-search", "true");
               chooser.setAttribute("title", "Contingency table variables...");

          // Load the empty HTML selector - OLD
          // var chooser = document.getElementById('chooser_contingency')

          // Add all the variable names to the selector.
          for (const col of columns){
            var opt = document.createElement('option');
              opt.value = col;
              opt.innerHTML = col;
              chooser.appendChild(opt);
          }

          // Add a button that will generate the contingency table when clicked
          var $showContTable = $('<button id="show_contingency_table" class="btn btn-primary">Show contingency table</button>');
          
          // Add 'em both to the output_contingency div
          $('#output_contingency').empty().append("<br>").append(contTitle).append("<br>").append(chooser).append($showContTable);

          // Then refresh the selector - otherwise it doesn't show up
          $('#chooser_contingency').selectpicker("refresh");

          // CONTNGENCY TABLE IS GENERATED USING A LISTENER - SEE BOTTOM OF PAGE

          // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          // OUTPUT_HISTOGRAM ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

          var infotext_hist = "Select a numeric variable to generate a histogram. Non-numeric variables will be ignored.";
          var contTitle_hist = $('<div>').html("<h4>Histogram: <i class='fa fa-info-circle' data-toggle='tooltip' data-html='true' title='" + infotext_hist + "'></i></h4>");

          // PART 1: Done before selecting any variables
          // Create an empty HTML selector
          var hist_choose = document.createElement('select');
               hist_choose.className = "selectpicker";
               hist_choose.id = "chooser_hist";
               hist_choose.multiple = false;
               hist_choose.setAttribute("data-live-search", "true");
               hist_choose.setAttribute("title", "Histogram variables...");

          // Add all the variable names to the selector.
          for (const col of columns){
            var opt = document.createElement('option');
              opt.value = col;
              opt.innerHTML = col;
              hist_choose.appendChild(opt);
          }

          // Add a button that will generate the histogram when clicked
          var $showHistBtn = $('<button id="show_histogram_btn" class="btn btn-primary">Show histogram</button>');

          // Add 'em both to the output_histogram div
          $('#output_histogram').empty().append("<br>").append(contTitle_hist).append(hist_choose).append($showHistBtn);

          // Then refresh the selector - otherwise it doesn't show up
          $('#chooser_hist').selectpicker("refresh");

          // HISTOGRAM IS GENERATED USING A LISTENER - SEE BOTTOM OF PAGE
        },
        error: function (err) {
          $('#output_table').html('<p>Error parsing metadata: ' + String(err) + '</p>');
        }
      });
    })
    .catch(function (err) {
      console.error('Metadata fetch error for', metadataPath, err);
      $('#output_table').html('<p>Error loading metadata at <code>' + metadataPath + '</code>: ' + String(err) + '</p>');
    });

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// This will run automatically when the page loads
(function () {

  // Dataset selector funtions ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  // this adds the available dataset names to the drop down list
  function populate() {
    // All the records listed in the big CSV file
    var recs = window.databaseRecords || [];
    if (!recs.length) return false; // None found
    var seen = new Set();
    var $sel = $('#dataset_select');
    $sel.find('option:not([value=""])').remove(); // remove everything except the placeholder, not that anything should be there anyway
    // Add each UNIQUE dataset name
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
    // Try immediately; if not ready, try again in 100ms (max 5s)
    // Takes some milliseconds to load the data
    if (!populate()) {
      var tries = 0;
      var maxTries = 50;
      var t = setInterval(function () {
        if (populate() || ++tries >= maxTries) clearInterval(t);
      }, 100);
    }
    // Once people select a dataset, they need to click the load button
    // This function is activated once the page loads - it'll work every time they press the button, not just when the page loads
    $('#show_metadata_btn').on('click', function () {
      var ds = $('#dataset_select').val(); // ds is the dataset name
      if (!ds) { alert('Please select a dataset'); return; } // If they search without selecting a dataset
      showMetadataTable(ds); // This function is defined above
    });

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Recreate the contingency table every time the button's clicked
    $('#output_contingency').on('click', '#show_contingency_table', function () {
      var selectedValues = $('#chooser_contingency').val();
      if (!selectedValues || selectedValues.length === 0) {
        alert('Please select at least one variable for the contingency table.');
        return;
      }
      // Generate the contingency table
      //    remove previous table, if it exists
      $('#contingency_table_wrapper').remove();
      //    Grab the data from the Papa Parse results
      var data = (window._metadata_current && window._metadata_current.data) || [];
      //    Create the table
      var contTable = combinationCounts(data, selectedValues);
      //    The table goes into its own div, which is then added to the output_contingency div.
      var $wrap = $('<div id="contingency_table_wrapper" style="margin-top:8px;"></div>');
      $wrap.append(renderCombinationTable(contTable, selectedValues));
      $('#output_contingency').append($wrap);
      // make pretty with DataTable. comb_table ID is assigned in the render function at top of page
      if ($.fn.dataTable) {
        if ($.fn.dataTable.isDataTable('#comb_table')) { $('#comb_table').DataTable().destroy(); }
        $('#comb_table').DataTable({ pageLength: Infinity, responsive: true });
      }
    });
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Recreate the histogram every time the button's clicked
    $('#output_histogram').on('click', '#show_histogram_btn', function () {
      var selectedValues = $('#chooser_hist').val();
      if (!selectedValues) { alert('Please select a variable for the histogram.'); return; }
      var data = (window._metadata_current && window._metadata_current.data) || [];

      // remove previous histograms wrapper (wipe all previous charts)
      $('#histograms_wrapper').remove();
      var $hw = $('<div id="histograms_wrapper" style="margin-top:8px;"></div>');
      $('#output_histogram').append($hw);
      // normalize to array (single-select returns string)
      if (!Array.isArray(selectedValues)) selectedValues = [selectedValues];

      // render into the single wrapper (renderHistogram will replace individual canvases inside)
      selectedValues.forEach(function (col) {
        renderHistogram(data, col, { bins: 10, container: '#histograms_wrapper', title: 'Histogram of: ' + col });
      });
    });
  });
  
})();