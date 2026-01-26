
/**
 * Utility to standard abbreviations for procedure types.
 * Designed to be short but "understandable" (e.g. SIMPL. instead of SIMP.)
 */
export const abbreviateProcedureType = (fullName: string): string => {
    if (!fullName) return "";

    // Common replacements map - Focused on "Understandable" abbreviations
    const replacements: Record<string, string> = {
        "ADJUDICACION": "ADJ.",
        "ADJUDICACIÓN": "ADJ.",
        "SIMPLIFICADA": "SIMPL.",
        "DIRECTA": "DIR.",
        "PUBLICA": "PÚB.",
        "PÚBLICA": "PÚB.",
        "SELECTIVA": "SELEC.",
        "ABREVIADA": "ABREV.",
        "LICITACION": "LIC.",
        "LICITACIÓN": "LIC.",
        "CONCURSO": "CONC.",
        "ESPECIAL": "ESP.",
        "PROCEDIMIENTO": "PROC.",
        "SELECCION": "SELEC.",
        "SELECCIÓN": "SELEC.",
        "SUBASTA": "SUB.",
        "INVERSA": "INV.",
        "ELECTRONICA": "ELEC.",
        "ELECTRÓNICA": "ELEC.",
        "DECRETO": "DEC.",
        "URGENCIA": "URG.",
        "COMPLEMENTARIA": "COMPL.",
        "DISPOSICION": "DISP.",
        "DISPOSICIÓN": "DISP.",
        "SERVICIO": "SERV.",
        "SERVICIOS": "SERV.",
        "HOMOLOGACION": "HOMOLOG.",
        "HOMOLOGACIÓN": "HOMOLOG.",
        "EMERGENCIA": "EMERG.",
        "SEPTIMA": "7ª",
        "SÉPTIMA": "7ª",
        "DECIMA": "10ª",
        "DÉCIMA": "10ª",
        "FINAL": "FIN.",
        "REGLAMENTO": "REG.",
        "MENOR": "MEN.",
        "CUANTIA": "CUANT.",
        "CUANTÍA": "CUANT.",
        "REGIMEN": "SIST.",
        "RÉGIMEN": "SIST.",
        "COMPARACION": "COMP.",
        "COMPARACIÓN": "COMP.",
        "PRECIOS": "PREC."
    };

    // Words to keep as is
    const keepWords = [
        "DE", "DEL", "LA", "EL", "Y", "O", "CON", "SIN",
        "N°", "Nº", "LEY", "DL", "DU", "DS", "DCF", "DC"
    ];

    // PHRASE REPLACEMENTS (Run before splitting)
    let processedName = fullName.toUpperCase();

    // Standard Legal Acronyms - Handle phrases first!
    processedName = processedName.replace(/DISPOSICIÓN COMPLEMENTARIA FINAL/g, "DCF");
    processedName = processedName.replace(/DISPOSICION COMPLEMENTARIA FINAL/g, "DCF");
    processedName = processedName.replace(/DISPOSICIÓN COMPLEMENTARIA/g, "DC");
    processedName = processedName.replace(/DISPOSICION COMPLEMENTARIA/g, "DC");

    return processedName.split(/\s+/).map(word => {
        // Strip punctuation ONLY from ends
        const cleanWord = word.replace(/^[^A-Z0-9ÁÉÍÓÚÑ]+|[^A-Z0-9ÁÉÍÓÚÑ]+$/g, '');

        if (!cleanWord) return word;
        if (keepWords.includes(cleanWord)) return word;

        // Exact match check
        if (replacements[cleanWord]) {
            return replacements[cleanWord];
        }

        // If not in dictionary, check if it's a code (contains digits)
        if (/\d/.test(cleanWord)) {
            return word;
        }

        return word;
    }).join(" ");
};
