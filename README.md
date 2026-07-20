# CURE-dataset-repository
This repository contains information on the datasets used in MICB_V 305 at the University of British Columbia. MICB_V 305 is a **C**ourse-based **U**ndergraduate **R**esearch **E**xperience course aimed at third-, fourth-, and fifth-year Microbiology and Immunology students at UBC. More information on CURE offerings in the Department of Microbiology and Immunology at UBC can be found [here](https://blogs.ubc.ca/mbimcures/).

## File Structure
```
.
├── css
├── cure_search
│   └── node_modules
├── metadata
└── Project_Database.csv
```
### Important Directories
- ```css``` contains the css code used to design the website,
- ```cure_search``` contains the files used for the CURE Search website,
- ```metadata``` contains the raw ```csv``` files for the datasets used in MICB_V 305,
- ```Project_Database.csv``` contains the datasets used in MICB_V 305 in a human-readable file.

## Replicating at your institution
TBD

## Dataset Requirements
- The file can have any title, but it must match the filepath provided in the project database file.
- The metadata should be a tidy table in csv or tsv format, where each sample is a row and each variable is a column.
- The metadata table should not include any additional lines (ex. a line of text in a row above the table)
- The metadata should match the version provided to students. This will help to ensure that students accurately report which variables they analyzed.

## Attributions

Base files from ```armetcal.github.io``` by [Dr. Avril Metcalfe-Roach](https://github.com/armetcal).
