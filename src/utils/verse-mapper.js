/**
 * Verse Mapper Utility
 * Provides mapping between Madani-Last (Warsh) and Kufi (Hafs) verse numbering.
 */

// Disputed points data extracted from qiraat-ayah-map project
// Format: surah: { kufiAyah: { end: boolean (is it an end in Madani?), internal: number (how many extra ends inside this Kufi ayah?) } }
const DISPUTED_POINTS = {
  "1": { "1": { "end": false }, "7": { "internal": 1 } },
  "2": { "1": { "end": false }, "200": { "end": false }, "255": { "internal": 1 } },
  "3": { "1": { "end": false }, "4": { "internal": 1 }, "48": { "end": false }, "92": { "internal": 1 } },
  "4": { "44": { "end": false } },
  "5": { "1": { "internal": 1 }, "15": { "internal": 1 } },
  "6": { "1": { "internal": 1 }, "66": { "end": false }, "73": { "internal": 1 }, "161": { "internal": 1 } },
  "7": { "1": { "end": false }, "29": { "end": false }, "38": { "internal": 1 }, "137": { "internal": 1 } },
  "8": { "42": { "internal": 1 } },
  "9": { "70": { "internal": 1 } },
  "11": { "54": { "end": false }, "82": { "end": false, "internal": 1 }, "86": { "internal": 1 }, "118": { "end": false }, "121": { "end": false } },
  "13": { "5": { "internal": 1 }, "16": { "internal": 1 }, "23": { "end": false } },
  "14": { "1": { "internal": 1 }, "5": { "internal": 1 }, "9": { "internal": 1 }, "19": { "end": false } },
  "17": { "107": { "end": false } },
  "18": { "22": { "internal": 1 }, "23": { "end": false }, "35": { "end": false }, "85": { "end": false }, "89": { "end": false }, "92": { "end": false }, "103": { "end": false } },
  "19": { "1": { "end": false }, "41": { "internal": 1 }, "75": { "internal": 1 } },
  "20": { "1": { "end": false }, "39": { "internal": 1 }, "41": { "end": false }, "78": { "end": false }, "86": { "internal": 1 }, "87": { "end": false }, "89": { "internal": 1 }, "92": { "end": false }, "106": { "end": false }, "123": { "internal": 1 }, "131": { "internal": 1 } },
  "21": { "66": { "end": false } },
  "22": { "19": { "end": false }, "20": { "end": false } },
  "23": { "45": { "internal": 1 } },
  "24": { "36": { "end": false }, "43": { "end": false } },
  "26": { "1": { "end": false }, "49": { "internal": 1 }, "210": { "end": false } },
  "27": { "33": { "internal": 1 }, "44": { "internal": 1 } },
  "28": { "1": { "end": false }, "23": { "internal": 1 } },
  "29": { "1": { "end": false }, "29": { "internal": 1 } },
  "30": { "1": { "end": false }, "2": { "end": false }, "4": { "internal": 1 } },
  "31": { "1": { "end": false } },
  "32": { "1": { "end": false }, "10": { "internal": 1 } },
  "35": { "43": { "internal": 1 } },
  "36": { "1": { "end": false } },
  "38": { "1": { "end": false }, "84": { "end": false } },
  "39": { "3": { "internal": 1 }, "11": { "end": false }, "14": { "end": false }, "36": { "end": false }, "39": { "end": false } },
  "40": { "1": { "end": false }, "18": { "internal": 1 }, "53": { "end": false }, "58": { "internal": 1 }, "73": { "end": false } },
  "41": { "1": { "end": false } },
  "42": { "1": { "end": false }, "2": { "end": false }, "32": { "end": false } },
  "43": { "1": { "end": false }, "52": { "internal": 1 } },
  "44": { "1": { "end": false }, "34": { "end": false }, "43": { "end": false } },
  "45": { "1": { "end": false } },
  "46": { "1": { "end": false } },
  "47": { "4": { "internal": 1 } },
  "52": { "1": { "end": false }, "13": { "end": false } },
  "53": { "28": { "end": false } },
  "55": { "1": { "end": false }, "3": { "end": false }, "35": { "internal": 1 } },
  "56": { "8": { "internal": 1 }, "9": { "internal": 1 }, "18": { "internal": 1 }, "22": { "end": false }, "41": { "internal": 1 }, "49": { "end": false }, "50": { "internal": 1 } },
  "57": { "13": { "end": false } },
  "58": { "20": { "end": false } },
  "67": { "9": { "internal": 1 } },
  "69": { "1": { "end": false }, "25": { "internal": 1 } },
  "71": { "23": { "internal": 1 }, "25": { "internal": 1 } },
  "73": { "1": { "end": false }, "17": { "end": false } },
  "74": { "40": { "end": false } },
  "75": { "16": { "end": false } },
  "79": { "37": { "end": false } },
  "89": { "15": { "internal": 1 }, "16": { "internal": 1 }, "23": { "internal": 1 }, "29": { "end": false } },
  "96": { "15": { "internal": 1 } },
  "99": { "6": { "internal": 1 } },
  "101": { "1": { "end": false } },
  "103": { "1": { "end": false }, "3": { "internal": 1 } },
  "106": { "4": { "internal": 1 } },
  "107": { "6": { "end": false } }
};

// Surah ayah counts (Kufi and Madani-Last)
const SURAH_COUNTS = {
  "1": { "kufi": 7, "madani": 7 },
  "2": { "kufi": 286, "madani": 285 },
  "4": { "kufi": 176, "madani": 175 },
  "5": { "kufi": 120, "madani": 122 },
  "6": { "kufi": 165, "madani": 167 },
  "8": { "kufi": 75, "madani": 76 },
  "9": { "kufi": 129, "madani": 130 },
  "11": { "kufi": 123, "madani": 121 },
  "13": { "kufi": 43, "madani": 44 },
  "14": { "kufi": 52, "madani": 54 },
  "17": { "kufi": 111, "madani": 110 },
  "18": { "kufi": 110, "madani": 105 },
  "19": { "kufi": 98, "madani": 99 },
  "20": { "kufi": 135, "madani": 134 },
  "21": { "kufi": 112, "madani": 111 },
  "22": { "kufi": 78, "madani": 76 },
  "23": { "kufi": 118, "madani": 119 },
  "24": { "kufi": 64, "madani": 62 },
  "26": { "kufi": 227, "madani": 226 },
  "27": { "kufi": 93, "madani": 95 },
  "30": { "kufi": 60, "madani": 59 },
  "31": { "kufi": 34, "madani": 33 },
  "35": { "kufi": 45, "madani": 46 },
  "36": { "kufi": 83, "madani": 82 },
  "38": { "kufi": 88, "madani": 86 },
  "39": { "kufi": 75, "madani": 72 },
  "40": { "kufi": 85, "madani": 82 },
  "41": { "kufi": 54, "madani": 53 },
  "42": { "kufi": 53, "madani": 50 },
  "44": { "kufi": 59, "madani": 56 },
  "45": { "kufi": 37, "madani": 36 },
  "46": { "kufi": 35, "madani": 34 },
  "47": { "kufi": 38, "madani": 39 },
  "52": { "kufi": 49, "madani": 47 },
  "53": { "kufi": 62, "madani": 61 },
  "55": { "kufi": 78, "madani": 77 },
  "56": { "kufi": 96, "madani": 99 },
  "57": { "kufi": 29, "madani": 28 },
  "58": { "kufi": 22, "madani": 21 },
  "67": { "kufi": 30, "madani": 31 },
  "71": { "kufi": 28, "madani": 30 },
  "73": { "kufi": 20, "madani": 18 },
  "74": { "kufi": 56, "madani": 55 },
  "75": { "kufi": 40, "madani": 39 },
  "79": { "kufi": 46, "madani": 45 },
  "89": { "kufi": 30, "madani": 32 },
  "96": { "kufi": 19, "madani": 20 },
  "99": { "kufi": 8, "madani": 9 },
  "101": { "kufi": 11, "madani": 10 },
  "106": { "kufi": 4, "madani": 5 },
  "107": { "kufi": 7, "madani": 6 }
};

export class VerseMapper {
    /**
     * Maps a Warsh (Madani-Last) ayah number to its corresponding Hafs (Kufi) ayah numbers.
     * @param {number} surah 
     * @param {number} warshAyah 
     * @returns {number[]} Array of Kufi ayah numbers
     */
    static mapWarshToKufi(surah, warshAyah) {
        const surahStr = String(surah);
        const disputed = DISPUTED_POINTS[surahStr] || {};
        const counts = SURAH_COUNTS[surahStr];
        
        // If no disputed points and counts are same, it's 1-to-1
        if (!Object.keys(disputed).length && (!counts || counts.kufi === counts.madani)) {
            return [warshAyah];
        }

        // Logic: Iterate through Kufi ayahs and build Madani index
        let currentK = 1;
        let currentM = 1;
        const totalK = counts ? counts.kufi : 286; 

        while (currentK <= totalK) {
            const point = disputed[String(currentK)];
            const internalCount = point ? (point.internal || 0) : 0;
            const isKufiEndAlsoMadaniEnd = point ? (point.end !== false) : true;

            // 1. Handle all internal Madani ends within this Kufi ayah
            for (let i = 0; i < internalCount; i++) {
                if (currentM === warshAyah) return [currentK];
                currentM++;
            }

            // 2. Handle the "main" Madani ayah that terminates at or after this Kufi boundary
            if (isKufiEndAlsoMadaniEnd) {
                // This Kufi ayah ends the current Madani ayah
                if (currentM === warshAyah) return [currentK];
                currentM++;
            } else {
                // This Kufi ayah does NOT end the Madani ayah; it merges into the next
                if (currentM === warshAyah) {
                    let mergedK = [currentK];
                    let nextK = currentK + 1;
                    while (nextK <= totalK) {
                        mergedK.push(nextK);
                        const nextPoint = disputed[String(nextK)];
                        if (!nextPoint || nextPoint.end !== false) break;
                        nextK++;
                    }
                    return mergedK;
                }
                
                // Advance currentK to the end of the merge block for indexing purposes
                let nextK = currentK + 1;
                while (nextK <= totalK) {
                    const nextPoint = disputed[String(nextK)];
                    if (!nextPoint || nextPoint.end !== false) break;
                    nextK++;
                }
                currentK = nextK; 
                currentM++;
            }
            currentK++;
        }
        
        return [warshAyah]; // Fallback
    }
}
