export type XlsxCellValue = string | number | boolean | null | undefined;
export type XlsxCellStyle =
    | 'title'
    | 'subtitle'
    | 'muted'
    | 'section'
    | 'header'
    | 'label'
    | 'metric'
    | 'currency'
    | 'text'
    | 'textCenter';

export type XlsxCellInput =
    | XlsxCellValue
    | {
        value: XlsxCellValue;
        style?: XlsxCellStyle;
    };

export type XlsxSheetInput = {
    name: string;
    rows: XlsxCellInput[][];
    columns?: number[];
    merges?: string[];
    freeze?: {
        row?: number;
        col?: number;
    };
};

type ZipFileInput = { name: string; data: Uint8Array };

type NormalizedCell = {
    value: XlsxCellValue;
    style: XlsxCellStyle | undefined;
};

const encoder = new TextEncoder();

const encodeText = (value: string) => encoder.encode(value);

const escapeXml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&apos;');

const toColumnName = (index: number) => {
    let n = index + 1;
    let name = '';
    while (n > 0) {
        const rem = (n - 1) % 26;
        name = String.fromCharCode(65 + rem) + name;
        n = Math.floor((n - 1) / 26);
    }
    return name;
};

const sanitizeSheetName = (rawName: string) => {
    const cleaned = (rawName || 'Sheet')
        .toString()
        .replace(/[\[\]\:\*\?\/\\]/g, '-')
        .trim();
    const nonEmpty = cleaned || 'Sheet';
    return nonEmpty.slice(0, 31);
};

const dedupeSheetNames = (names: string[]) => {
    const used = new Map<string, number>();
    return names.map((name) => {
        const base = sanitizeSheetName(name);
        const count = used.get(base) || 0;
        used.set(base, count + 1);
        if (count === 0) return base;

        const suffix = ` (${count + 1})`;
        const trimmedBase = base.slice(0, Math.max(0, 31 - suffix.length));
        return `${trimmedBase}${suffix}`;
    });
};

const normalizeCell = (cell: XlsxCellInput): NormalizedCell => {
    if (
        typeof cell === 'object' &&
        cell !== null &&
        ('value' in cell || 'style' in cell)
    ) {
        return {
            value: cell.value,
            style: cell.style,
        };
    }

    return {
        value: cell as XlsxCellValue,
        style: undefined,
    };
};

const STYLE_INDEX: Record<XlsxCellStyle, number> = {
    title: 1,
    subtitle: 2,
    muted: 3,
    section: 4,
    header: 5,
    label: 6,
    metric: 7,
    currency: 8,
    text: 9,
    textCenter: 10,
};

const createWorksheetXml = (sheet: XlsxSheetInput) => {
    const rows = sheet.rows || [[]];
    const rowXml: string[] = [];

    rows.forEach((row, rowIndex) => {
        const r = rowIndex + 1;
        const cellXml: string[] = [];

        row.forEach((rawCell, colIndex) => {
            const { value, style } = normalizeCell(rawCell);
            if (value === null || value === undefined) return;

            const ref = `${toColumnName(colIndex)}${r}`;
            const styleIndex = style ? STYLE_INDEX[style] : 0;
            const styleAttr = styleIndex ? ` s="${styleIndex}"` : '';

            if (typeof value === 'number' && Number.isFinite(value)) {
                cellXml.push(`<c r="${ref}"${styleAttr}><v>${value}</v></c>`);
                return;
            }

            if (typeof value === 'boolean') {
                cellXml.push(`<c r="${ref}" t="b"${styleAttr}><v>${value ? 1 : 0}</v></c>`);
                return;
            }

            const text = escapeXml(String(value));
            cellXml.push(
                `<c r="${ref}" t="inlineStr"${styleAttr}><is><t xml:space="preserve">${text}</t></is></c>`
            );
        });

        if (cellXml.length === 0) {
            rowXml.push(`<row r="${r}"/>`);
        } else {
            rowXml.push(`<row r="${r}">${cellXml.join('')}</row>`);
        }
    });

    const colsXml = (sheet.columns || []).length
        ? `<cols>${sheet.columns
            ?.map((width, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${width}" customWidth="1"/>`)
            .join('')}</cols>`
        : '';

    const freezeRow = Math.max(0, sheet.freeze?.row || 0);
    const freezeCol = Math.max(0, sheet.freeze?.col || 0);
    const topLeftCell = `${toColumnName(freezeCol)}${freezeRow + 1}`;
    const paneAttrs = [
        freezeCol > 0 ? `xSplit="${freezeCol}"` : '',
        freezeRow > 0 ? `ySplit="${freezeRow}"` : '',
        (freezeCol > 0 || freezeRow > 0) ? `topLeftCell="${topLeftCell}" state="frozen"` : '',
        freezeRow > 0 && freezeCol > 0 ? 'activePane="bottomRight"' : freezeRow > 0 ? 'activePane="bottomLeft"' : freezeCol > 0 ? 'activePane="topRight"' : '',
    ].filter(Boolean).join(' ');
    const sheetViewsXml = paneAttrs
        ? `<sheetViews><sheetView workbookViewId="0"><pane ${paneAttrs}/></sheetView></sheetViews>`
        : `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;

    const merges = sheet.merges || [];
    const mergeXml = merges.length
        ? `<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`
        : '';

    return (
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        sheetViewsXml +
        colsXml +
        `<sheetData>${rowXml.join('')}</sheetData>` +
        mergeXml +
        `</worksheet>`
    );
};

const createWorkbookXml = (sheetNames: string[]) => {
    const sheetsXml = sheetNames
        .map(
            (name, index) =>
                `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
        )
        .join('');

    return (
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets>${sheetsXml}</sheets>` +
        `</workbook>`
    );
};

const createWorkbookRelsXml = (sheetCount: number) => {
    const relsXml = Array.from({ length: sheetCount }, (_, idx) => {
        const id = idx + 1;
        return `<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${id}.xml"/>`;
    }).join('');

    return (
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        relsXml +
        `<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`
    );
};

const createPackageRelsXml = () =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

const createContentTypesXml = (sheetCount: number) => {
    const overrides = Array.from({ length: sheetCount }, (_, idx) => {
        const id = idx + 1;
        return `<Override PartName="/xl/worksheets/sheet${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
    }).join('');

    return (
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        overrides +
        `</Types>`
    );
};

const createStylesXml = () =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;PHP&quot; #,##0.00"/></numFmts>` +
    `<fonts count="5">` +
    `<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>` +
    `<font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>` +
    `<font><b/><sz val="12"/><color rgb="FF130CB2"/><name val="Calibri"/><family val="2"/></font>` +
    `<font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/><family val="2"/></font>` +
    `<font><b/><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font>` +
    `</fonts>` +
    `<fills count="6">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FF130CB2"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFEFF3FF"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/><bgColor indexed="64"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="2">` +
    `<border><left/><right/><top/><bottom/><diagonal/></border>` +
    `<border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border>` +
    `</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="11">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="164" fontId="4" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `</cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;

let crcTable: Uint32Array | null = null;

const getCrcTable = () => {
    if (crcTable) return crcTable;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
        }
        table[i] = c >>> 0;
    }
    crcTable = table;
    return table;
};

const crc32 = (data: Uint8Array) => {
    const table = getCrcTable();
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
};

const concatUint8Arrays = (arrays: Uint8Array[]) => {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    arrays.forEach((arr) => {
        result.set(arr, offset);
        offset += arr.length;
    });
    return result;
};

const createZip = (files: ZipFileInput[]) => {
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    files.forEach((file) => {
        const nameBytes = encodeText(file.name);
        const data = file.data;
        const fileCrc = crc32(data);
        const localOffset = offset;

        const localHeader = new Uint8Array(30 + nameBytes.length);
        const view = new DataView(localHeader.buffer);
        view.setUint32(0, 0x04034b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 0, true);
        view.setUint16(8, 0, true);
        view.setUint16(10, 0, true);
        view.setUint16(12, 0, true);
        view.setUint32(14, fileCrc, true);
        view.setUint32(18, data.length, true);
        view.setUint32(22, data.length, true);
        view.setUint16(26, nameBytes.length, true);
        view.setUint16(28, 0, true);
        localHeader.set(nameBytes, 30);

        localParts.push(localHeader, data);
        offset += localHeader.length + data.length;

        const centralHeader = new Uint8Array(46 + nameBytes.length);
        const cView = new DataView(centralHeader.buffer);
        cView.setUint32(0, 0x02014b50, true);
        cView.setUint16(4, 20, true);
        cView.setUint16(6, 20, true);
        cView.setUint16(8, 0, true);
        cView.setUint16(10, 0, true);
        cView.setUint16(12, 0, true);
        cView.setUint16(14, 0, true);
        cView.setUint32(16, fileCrc, true);
        cView.setUint32(20, data.length, true);
        cView.setUint32(24, data.length, true);
        cView.setUint16(28, nameBytes.length, true);
        cView.setUint16(30, 0, true);
        cView.setUint16(32, 0, true);
        cView.setUint16(34, 0, true);
        cView.setUint16(36, 0, true);
        cView.setUint32(38, 0, true);
        cView.setUint32(42, localOffset, true);
        centralHeader.set(nameBytes, 46);

        centralParts.push(centralHeader);
    });

    const centralStart = offset;
    const centralDirectory = concatUint8Arrays(centralParts);
    const centralSize = centralDirectory.length;

    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, centralStart, true);
    endView.setUint16(20, 0, true);

    return concatUint8Arrays([...localParts, centralDirectory, end]);
};

export const createXlsxFile = (sheets: XlsxSheetInput[]) => {
    const safeSheets = sheets.length ? sheets : [{ name: 'Sheet1', rows: [[]] }];
    const sheetNames = dedupeSheetNames(safeSheets.map((sheet) => sheet.name));

    const files: ZipFileInput[] = [];
    files.push({
        name: '[Content_Types].xml',
        data: encodeText(createContentTypesXml(safeSheets.length)),
    });
    files.push({
        name: '_rels/.rels',
        data: encodeText(createPackageRelsXml()),
    });
    files.push({
        name: 'xl/workbook.xml',
        data: encodeText(createWorkbookXml(sheetNames)),
    });
    files.push({
        name: 'xl/_rels/workbook.xml.rels',
        data: encodeText(createWorkbookRelsXml(safeSheets.length)),
    });
    files.push({
        name: 'xl/styles.xml',
        data: encodeText(createStylesXml()),
    });

    safeSheets.forEach((sheet, idx) => {
        files.push({
            name: `xl/worksheets/sheet${idx + 1}.xml`,
            data: encodeText(createWorksheetXml(sheet)),
        });
    });

    return createZip(files);
};

export const downloadXlsx = (filename: string, bytes: Uint8Array) => {
    const arrayBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(arrayBuffer).set(bytes);
    const blob = new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
};
