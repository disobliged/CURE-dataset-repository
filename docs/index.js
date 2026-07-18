// This script searches the Project_Database.csv to find matching projects.
// It's currently set up to search specific columns, but can be modified to search other columns as needed.
// If you want to add more, just Ctrl+F for one of the default options (ex. Data_Accession) and then copy those lines for whatever column you want.

(function () {

  // VERY IMPORTANT THAT THIS FILE PATH IS ACCURATE
  // database_location: the path to the project repo CSV file (relative to the top of the Github repo)
  var config = {
    database_location: '/Project_Database.csv',
  };

  window.databaseRecords = [];

  // Load PapaParse, then parse the CSV
  function loadPapaAndParse() {
    if (window.Papa) return parseCsv();
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js';
    s.onload = parseCsv;
    document.head.appendChild(s);
  }

  // This loads the main database CSV file (config.database_location) and stores it in window.databaseRecords.
  function parseCsv() {
    Papa.parse(config.database_location, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function (res) {
        window.databaseRecords = (res.data || []).map(function (r) {
          var out = {};
          Object.keys(r).forEach(function (k) { out[k && k.trim()] = r[k]; });
          return out;
        });
      }
    });
  }

  // This function searches the database records for matches to the search term.
  // You can add more search terms if you want - just follow the style shown below, and make sure it matches the project repo csv.
  function searchProjects(term, searchParam) {
    if (!term) return [];
    var q = String(term).trim().toLowerCase(); // q is the person's search query
    if (!q) return [];
    var recs = window.databaseRecords || [];
    
    // removes undefined or null values and converts to lowercase for comparison
    function get(r, f) { return (r[f] || '').toString().toLowerCase(); }

    // Then we filter the CSV to only include records with matching text.
    return recs.filter(function (r) {
      if (!searchParam || searchParam === 'all') {
        return get(r, 'Paper_DOI').includes(q) ||
               get(r, 'Paper_Title').includes(q) ||
               get(r, 'Data_Accession').includes(q) ||
               get(r, 'Data_Name').includes(q);
      }
      switch (searchParam) {
        case 'doi': return get(r, 'Paper_DOI').includes(q);
        case 'data_accession': return get(r, 'Data_Accession').includes(q);
        case 'dataset_name': return get(r, 'Data_Name').includes(q);
        case 'paper_title': return get(r, 'Paper_Title').includes(q);
        default:
          return get(r, 'Paper_DOI').includes(q) ||
                 get(r, 'Paper_Title').includes(q) ||
                 get(r, 'Data_Accession').includes(q) ||
                 get(r, 'Data_Name').includes(q);
      }
    });
  }

  // This function renders the search results to the page - helpful if you want to actually see the results!
  // It also formats the results so that it's not just a big blob of text.
  function renderResults(results, term) {
    var $out = $('#search_results');
    if ($out.length === 0) {
      $out = $('<div id="search_results"></div>');
      $('.content').append($out);
    }
    $out.empty();

    if (!results || results.length === 0) {
      $out.text('No matching projects or datasets found.');
      return;
    }

    // This is where everything gets formatted.
    $out.append($('<h3></h3>').text("Search Results for '" + term + "':"));
    var $ul = $('<ul></ul>');
    results.forEach(function (r) {
      var accession = r['Data_Accession'] || '';
      var dname = r['Data_Name'] || '';
      var metadata = r['Data_Metadata'] || '';
      var ptitle = r['Paper_Title'] || '';
      var pyear = r['Paper_Year'] || '';
      var ptype = r['Paper_Type'] || '';
      var plink = r['Paper_Link'] || '';

      var $li = $('<li></li>');
      var $top = $('<div></div>');
      $top.append($('<strong></strong>').text('Dataset Accession: '))
          .append(document.createTextNode(accession + '  '))
          .append($('<strong></strong>').text('Dataset Name: '))
          .append(document.createTextNode(dname + '  '))
          .append($('<a></a>').attr('href', ('../' + metadata)).attr('target','_blank').text('Download metadata'));
      $li.append($top);

      var $meta = $('<div></div>');
      $meta.append($('<strong></strong>').text('Manuscript Title: '))
           .append(document.createTextNode(ptitle));
      $meta.append(' ');
      $meta.append($('<strong></strong>').text('Year: '))
           .append(document.createTextNode(pyear + ' '));
      $meta.append($('<strong></strong>').text('Type: '))
           .append(document.createTextNode(ptype + ' '));
      if (plink) {
        $meta.append($('<a></a>').attr('href', plink).attr('target','_blank').text('Link to paper'));
      }
      $li.append($meta);
      $ul.append($li);
    });
    $out.append($ul);
  }

  // Two ways to run the search: press Search or Enter.

  // This runs the search function when the user clicks the search button.
  window.do_onclick = function () {
    var term = ($('#search_bar').val() || '').toString().trim();
    var param = $('#search_param').val() || '';
    var results = searchProjects(term, param);
    renderResults(results, term);
  };

  // This runs the search function when the user presses the Enter key in the search bar.
  $(function () {
    $('#search_bar').on('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('#do').trigger('click');
      }
    });
    loadPapaAndParse();
  });

})();