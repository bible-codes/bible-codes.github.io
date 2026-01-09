#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automated ELS search for זבידה (Zebidah) with skip distances -1000 to +1000
"""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import all necessary modules
import numpy as np
import pandas as pd
np.set_printoptions(legacy="1.25")

# Import all module functions
import mod_0_GetUserInput_CodexToSearch
import mod_1A_GetUserInput_TextToSearch_Koren
import mod_2A_TextFileOpen_Koren
import mod_3A1_TextFilePreprocess_Koren_ExtractStrings
import mod_3A3_TextFilePreprocess_Koren_FixKeys
import mod_3A4_TextFilePreprocess_Koren_FixLines
import mod_3A5_TextFileParse_Koren
import mod_8A_DataObjectsCreate
import mod_8B_DataObjectsCreate
import mod_8C_DataObjectsCreate
import mod_8D_DataObjectsCreate
import mod_8E_DataObjectsCreate
import mod_9A_GetNumberValues4Letters
import mod_9AA_CalculateLetterPercentages
import mod_9AAA_AddGematriaNumberValuesToLetterObjects
import mod_9B_GetNumberValues4Words
import mod_10_ListOfIndexesCustomCreate
import mod_11A_TupleOfWordsAndGematriaValuesCreate
import mod_11B_AssignWordNumberToEachLetterObject
import mod_12_GetLengthOfTextToSearch
import mod_17A_GetUserInput_ELSSearchTerms
import mod_18_NumpyArrayOfNumberValuesCreate
import mod_19_GetMatchesPerIntegerValue
import mod_20_DictOfELSObjectsCreate
import mod_21_PandasObjectsCreate
import mod_22A_ELSSearchByLetterFirst
import mod_22B_NegativesAndPositivesExtract
import mod_23_ELSSearchByLetterLast
import mod_24_AddSearchResultsToDELSO
import mod_25_UpdateW4ELS
import mod_26_UpdateW
import mod_27_GatherData4ELSMatches
import mod_28_ExtractAllELSLetterPositions
import mod_98_FileNamesCreate
import mod_99_WriteOutputToFileCSV_ELSMatches

from mod_cls_GlobalSearchObject import cls_GlobalSearchObject as GSO
from mod_cls_LetterObject import cls_LetterObject as LO
from mod_cls_ELSObject import cls_ELSObject as ELSO

print("\n=== Automated ELS Search for זבידה ===\n")

# Select Koren Codex (1) and Genesis (1)
NumberOfCodexChosen = 1  # Koren Codex
NumberOfTextChosen = 1   # Genesis

print(f"Selected: Koren Codex - Genesis")

# Open and process the text file
TextKoren = mod_2A_TextFileOpen_Koren.fn_TextFileOpen(NumberOfTextChosen)
ListOfTupleKeysToFix, ListOfWordsInLine = mod_3A1_TextFilePreprocess_Koren_ExtractStrings.fn_ExtractStrings(TextKoren)
ListOfTupleKeysForKoren = mod_3A3_TextFilePreprocess_Koren_FixKeys.fn_FixKeys(ListOfTupleKeysToFix)
DVK = mod_3A4_TextFilePreprocess_Koren_FixLines.fn_FixLines(ListOfTupleKeysForKoren, ListOfWordsInLine)
LW4AV, DVKH, DVKHS, VerseCountTotal, WordCountTotal, LetterCountTotal = mod_3A5_TextFileParse_Koren.fn_TextFileParse(DVK)

print(f"Text loaded: {LetterCountTotal} letters, {WordCountTotal} words, {VerseCountTotal} verses")

# Create search text chosen tuple
SearchTextChosen = (1,)
D, DS = DVKH, DVKHS

# Create data objects
S, L, DL, D5, DLO = mod_8A_DataObjectsCreate.fn_DataObjectsCreate(D)
ListOfTuplesOfLetterStatistics = mod_9AA_CalculateLetterPercentages.fn_CalculatePercentages(S)
LW, LNWEV, DWV, DWT = mod_8B_DataObjectsCreate.fn_DataObjectsCreate(DS)
ListOfIndexes4LettersInEachWord = mod_8C_DataObjectsCreate.fn_DataObjectsCreate(LW)
D5K = mod_8D_DataObjectsCreate.fn_DataObjectsCreate(D5)
DWTK = mod_8E_DataObjectsCreate.fn_DataObjectsCreate(DWT)
N = mod_9A_GetNumberValues4Letters.fn_GetNumberValues(S)
DLO = mod_9AAA_AddGematriaNumberValuesToLetterObjects.fn_AddGematriaNumberValuesToLetterObjects(DLO, N)
NW = mod_9B_GetNumberValues4Words.fn_GetNumberValues(LW)
ListOfIndexesCustom = mod_10_ListOfIndexesCustomCreate.fn_ListOfIndexesCustomCreate(D5)

# Create tuple of words and gematria values
W, DW = mod_11A_TupleOfWordsAndGematriaValuesCreate.fn_TupleOfWordsAndGematriaValuesCreate(LW, NW, ListOfIndexesCustom, ListOfIndexes4LettersInEachWord)

# Assign word numbers to letter objects
DLO = mod_11B_AssignWordNumberToEachLetterObject.fn_AssignWordNumberToEachLetterObject(DLO, DWT, ListOfIndexes4LettersInEachWord)

# Get length of text
LengthOfTextToSearch = mod_12_GetLengthOfTextToSearch.fn_GetLengthOfTextToSearch(L)
print(f"Length of text to search: {LengthOfTextToSearch} letters")

# Set up search parameters
NumberOfSearchTerms = 1
ListOfSearchTerms = ["זבידה"]  # Zebidah
DictOfSearchTerms = {1: "זבידה"}

print(f"\nSearching for: {ListOfSearchTerms[0]}")

# Convert search term to gematria values
search_term = ListOfSearchTerms[0]
gematria_values = []
for letter in search_term:
    if letter == 'ז':
        gematria_values.append(7)
    elif letter == 'ב':
        gematria_values.append(2)
    elif letter == 'י':
        gematria_values.append(10)
    elif letter == 'ד':
        gematria_values.append(4)
    elif letter == 'ה':
        gematria_values.append(5)

print(f"Gematria values: {gematria_values}")

# Set skip distance range
SkipDistanceDMinimum = -1000
SkipDistanceDMaximum = 1000

print(f"Skip distance range: {SkipDistanceDMinimum} to {SkipDistanceDMaximum}")

# Create numpy array of number values
NumpyArrayOfNumberValuesOfEntireText = mod_18_NumpyArrayOfNumberValuesCreate.fn_NumpyArrayCreate(N)

# Get matches per integer value
ListOfPDSeries4ELSs = mod_19_GetMatchesPerIntegerValue.fn_GetMatchesPerIntegerValue(DictOfSearchTerms, NumpyArrayOfNumberValuesOfEntireText)

# Create dictionary of ELS objects
DELSO = mod_20_DictOfELSObjectsCreate.fn_DictOfELSObjectsCreate(ListOfSearchTerms, DictOfSearchTerms, ListOfPDSeries4ELSs, NumpyArrayOfNumberValuesOfEntireText, LengthOfTextToSearch)

# Create pandas objects for search
sL0, sL, sLLL0, sLLL, sN0, sN = mod_21_PandasObjectsCreate.fn_PandasObjectsCreate(L, N)

print("\nPerforming ELS search...")

# Search by first letter
DictOfMatchesPositive = mod_22A_ELSSearchByLetterFirst.fn_ELSSearch(sL, sN, DELSO, DLO, SkipDistanceDMinimum, SkipDistanceDMaximum)

# Extract positive and negative matches
DELSMP, DELSMN = mod_22B_NegativesAndPositivesExtract.fn_NegativesAndPositivesExtract(DictOfMatchesPositive)

# Search by last letter
DictOfMatchesNegative = mod_23_ELSSearchByLetterLast.fn_ELSSearch(sL, sN, DELSO, DLO, SkipDistanceDMinimum, SkipDistanceDMaximum)

# Add search results to DELSO
DELSO = mod_24_AddSearchResultsToDELSO.fn_AddSearchResultsToDELSO(DELSO, DELSMP, DELSMN, DictOfMatchesNegative)

print(f"\nSearch complete!")
print(f"Positive matches: {len(DELSMP) if DELSMP else 0}")
print(f"Negative matches: {len(DELSMN) if DELSMN else 0}")

# Update word objects for ELS
NW4ELS = []
for each_search_term in ListOfSearchTerms:
    word_gematria = mod_9B_GetNumberValues4Words.fn_GetNumberValues([each_search_term])
    NW4ELS.append(word_gematria[0])

W4ELS = mod_25_UpdateW4ELS.fn_UpdateW4ELS(NW4ELS)
W = mod_26_UpdateW.fn_UpdateW(W, DW, ListOfSearchTerms, W4ELS)

# Gather data for ELS matches
LTM4ELS_LF_ABS, DLO, DELSO = mod_27_GatherData4ELSMatches.fn_GatherData4ELSMatches(DELSO, DLO, D5K, DWT, DWTK, DS, W)

# Extract all ELS letter positions
MasterList4LetterPositions, DLO = mod_28_ExtractAllELSLetterPositions.fn_ExtractAllELSLetterPositions(DELSO, DLO, D5K, DWT, DWTK, DS, W)

# Create output filename
OutputFileName = mod_98_FileNamesCreate.fn_FileNamesCreate("Koren", "1Genesis", "")

# Write results to CSV
print("\nWriting results to CSV files...")
mod_99_WriteOutputToFileCSV_ELSMatches.fn_WriteOutputToFileCSV(DELSO, OutputFileName)

print(f"\nResults saved to USER_GENERATED_FILES/")
print("Search for זבידה completed successfully!")

# Print summary of matches
if DELSMP or DELSMN:
    print("\n=== Match Summary ===")
    if DELSMP:
        print(f"\nPositive matches (forward direction):")
        for key, value in list(DELSMP.items())[:5]:  # Show first 5
            n, d, k = key
            print(f"  Position: {n}, Skip: {d}, Length: {k}")
    if DELSMN:
        print(f"\nNegative matches (backward direction):")
        for key, value in list(DELSMN.items())[:5]:  # Show first 5
            n, d, k = key
            print(f"  Position: {n}, Skip: {d}, Length: {k}")
else:
    print("\nNo matches found for זבידה with the specified skip distance range.")