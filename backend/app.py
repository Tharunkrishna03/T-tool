"""Local-only API for Excel Data Cleaner.

Workbooks live in a temporary directory and are cleared by /api/reset and on
process shutdown. No workbook data is written to a database or remote service.
"""

from __future__ import annotations

import re
import shutil
import tempfile
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

app = FastAPI(title="Excel Data Cleaner", docs_url="/api/docs")
app.add_middleware(
    CORSMiddleware,
    # Vite starts at 5173 and selects the next available port in development.
    # Keep the browser API access limited to loopback origins.
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
        "null",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = Path(tempfile.mkdtemp(prefix="excel-data-cleaner-"))
ALIASES = {
    "Product": ("product", "asset name", "asset", "product name"),
    "Type": ("type", "category", "asset type"),
    "Make": ("make", "manufacturer", "brand", "company"),
    "Model": ("model", "model no", "model number"),
    "Item": ("item", "item description", "description"),
    "Serial No": ("serial no", "serial number", "serial", "s/n"),
    "Asset Location": ("asset location", "location", "site"),
    "Project": ("project", "project name"),
    "Unit Price": ("unit price", "price", "cost", "amount"),
    "Tax Percent": ("tax percent", "tax", "gst", "tax %"),
    "Asset User": ("asset user", "user", "employee", "assigned to"),
    "Asset Tag": ("asset tag", "asset id", "tag", "asset number"),
}
SCIENTIFIC_PATTERN = re.compile(r"^[+-]?(?:\d+\.?\d*|\d*\.\d+)[eE][+-]?\d+$")


class Session:
    workbook_path: Path | None = None
    workbook_name: str | None = None
    sheets: list[str] = []
    active_sheet: str | None = None
    dataframe: pd.DataFrame = pd.DataFrame()


session = Session()


class SheetRequest(BaseModel):
    sheet: str


class DuplicateRequest(BaseModel):
    column: str
    action: str = Field(pattern="^(keep_first|keep_last|remove_all|highlight)$")
    confirmed: bool = False


class ColumnMapping(BaseModel):
    source: str
    target: str
    included: bool = True
    isCustom: bool = False
    fillOption: str | None = None
    defaultValue: str | None = None


class MappingRequest(BaseModel):
    columns: list[ColumnMapping]


class EmptyFieldRequest(BaseModel):
    column: str
    value: str | None = None
    confirmed: bool = False


class CellUpdateRequest(BaseModel):
    row: int = Field(ge=0)
    column: str
    value: str = ""


def clean_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def require_data() -> pd.DataFrame:
    if session.dataframe.empty and not len(session.dataframe.columns):
        raise HTTPException(400, "Upload an Excel file before using this action.")
    return session.dataframe


def read_sheet(sheet: str) -> pd.DataFrame:
    if not session.workbook_path:
        raise HTTPException(400, "No Excel file has been uploaded.")
    if session.workbook_path.suffix.lower() == ".csv":
        return pd.read_csv(session.workbook_path, dtype=str, keep_default_na=False).fillna("")
    frame = pd.read_excel(session.workbook_path, sheet_name=sheet, dtype=str, keep_default_na=False)
    return frame.fillna("")


def sheet_summary(frame: pd.DataFrame) -> dict[str, Any]:
    return {"rows": int(len(frame)), "columns": int(len(frame.columns)), "preview": frame.to_dict("records")}


def suggestion(value: str) -> str | None:
    try:
        dec = Decimal(value)
        if abs(dec.adjusted()) > 100:
            return None
        converted = format(dec, "f")
        return converted.split(".")[0] if "." in converted and set(converted.split(".")[1]) == {"0"} else converted
    except (InvalidOperation, ValueError):
        return None


def number_errors(frame: pd.DataFrame) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    for column in frame.columns:
        for index, value in frame[column].items():
            text = str(value).strip()
            if SCIENTIFIC_PATTERN.fullmatch(text):
                findings.append({
                    "row": int(index) + 2,
                    "field": column,
                    "current_value": text,
                    "possible_value": suggestion(text),
                    "warning": "Excel may have rounded the original long number. Verify before applying.",
                })
    return findings


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ready"}


@app.post("/api/upload")
async def upload_excel(file: UploadFile = File(...)) -> dict[str, Any]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".xlsx", ".xls", ".csv"}:
        raise HTTPException(400, "Please choose an .xlsx, .xls or .csv file.")
    cleanup_temp_files()
    destination = TEMP_DIR / f"source{suffix}"
    with destination.open("wb") as output:
        shutil.copyfileobj(file.file, output)
    try:
        if suffix == ".csv":
            sheet_names = ["CSV Data"]
        else:
            with pd.ExcelFile(destination) as workbook:
                if not workbook.sheet_names:
                    raise ValueError("The workbook has no sheets.")
                sheet_names = workbook.sheet_names
        session.workbook_path = destination
        session.workbook_name = file.filename
        session.sheets = sheet_names
        session.active_sheet = sheet_names[0]
        session.dataframe = read_sheet(session.active_sheet)
        return {"file_name": file.filename, "sheets": session.sheets, "active_sheet": session.active_sheet, **sheet_summary(session.dataframe)}
    except Exception as error:
        cleanup_temp_files()
        raise HTTPException(400, "This file could not be read. Please check that it is not corrupted and try again.") from error


@app.get("/api/sheets")
def get_sheets() -> dict[str, Any]:
    require_data()
    summaries = []
    for sheet in session.sheets:
        frame = read_sheet(sheet)
        summaries.append({"name": sheet, "rows": int(len(frame)), "columns": int(len(frame.columns))})
    return {"active_sheet": session.active_sheet, "sheets": summaries}


@app.post("/api/sheet/select")
def select_sheet(request: SheetRequest) -> dict[str, Any]:
    if request.sheet not in session.sheets:
        raise HTTPException(404, "We couldn't find that sheet in this Excel file.")
    session.active_sheet = request.sheet
    session.dataframe = read_sheet(request.sheet)
    return {"active_sheet": request.sheet, **sheet_summary(session.dataframe)}


@app.post("/api/cells/update")
def update_cell(request: CellUpdateRequest) -> dict[str, Any]:
    """Apply one user-approved edit from the review grid."""
    frame = require_data()
    if request.column not in frame.columns:
        raise HTTPException(400, "Please choose a valid column.")
    if request.row >= len(frame):
        raise HTTPException(400, "That row is no longer available.")
    session.dataframe = frame.copy()
    session.dataframe.at[request.row, request.column] = request.value
    return {"message": "Cell updated", "row": request.row, "column": request.column, "value": request.value}


@app.post("/api/merge")
def merge_sheets(sheets: list[str]) -> dict[str, Any]:
    if not sheets:
        raise HTTPException(400, "Select at least one sheet to merge.")
    missing = [sheet for sheet in sheets if sheet not in session.sheets]
    if missing:
        raise HTTPException(404, f"We couldn't find: {', '.join(missing)}")
    session.dataframe = pd.concat([read_sheet(sheet) for sheet in sheets], ignore_index=True).fillna("")
    session.active_sheet = "Merged data"
    return {"message": "Sheets merged successfully", **sheet_summary(session.dataframe)}


@app.post("/api/duplicates/detect")
def detect_duplicates(column: str) -> dict[str, Any]:
    frame = require_data()
    if column not in frame.columns:
        raise HTTPException(400, f"We couldn't find a {column} column. Please choose another field.")
    values = frame[column].astype(str).str.strip()
    mask = values.ne("") & values.duplicated(keep=False)
    return {"column": column, "count": int(mask.sum()), "rows": frame[mask].head(200).to_dict("records")}


@app.post("/api/duplicates/apply")
def apply_duplicates(request: DuplicateRequest) -> dict[str, Any]:
    frame = require_data()
    if not request.confirmed:
        raise HTTPException(400, "Please confirm this change before modifying your data.")
    if request.column not in frame.columns:
        raise HTTPException(400, "Please choose a valid duplicate-check column.")
    values = frame[request.column].astype(str).str.strip()
    if request.action == "highlight":
        return {"message": "Duplicates highlighted for review", "count": int((values.ne("") & values.duplicated(keep=False)).sum())}
    if request.action == "keep_first":
        mask = values.duplicated(keep="first") & values.ne("")
    elif request.action == "keep_last":
        mask = values.duplicated(keep="last") & values.ne("")
    else:
        mask = values.duplicated(keep=False) & values.ne("")
    removed = int(mask.sum())
    session.dataframe = frame.loc[~mask].reset_index(drop=True)
    return {"message": "Duplicate action applied", "removed": removed, "rows": int(len(session.dataframe))}


@app.post("/api/number-errors/detect")
def detect_number_errors() -> dict[str, Any]:
    return {"errors": number_errors(require_data())}


@app.post("/api/number-errors/apply")
def apply_number_errors(column: str | None = None, confirmed: bool = False) -> dict[str, Any]:
    frame = require_data().copy()
    if not confirmed:
        raise HTTPException(400, "Please confirm this correction before changing values.")
    changed = 0
    for field in frame.columns:
        if column and field != column:
            continue
        for index, value in frame[field].items():
            if SCIENTIFIC_PATTERN.fullmatch(str(value).strip()):
                converted = suggestion(str(value))
                if converted:
                    frame.at[index, field] = converted
                    changed += 1
    session.dataframe = frame
    return {"message": "Number corrections applied", "changed": changed}


@app.post("/api/mapping/auto")
def auto_map_columns() -> dict[str, Any]:
    frame = require_data()
    mapping = [{"source": col, "target": col, "included": True} for col in frame.columns]
    return {"mapping": mapping}


@app.post("/api/mapping/apply")
def apply_mapping(request: MappingRequest) -> dict[str, Any]:
    frame = require_data()
    output = pd.DataFrame(index=frame.index)
    for col in request.columns:
        if col.included:
            if col.isCustom:
                val = col.defaultValue if col.fillOption == "Fill with Default Value" and col.defaultValue else ""
                output[col.target] = val
            elif col.source in frame.columns:
                series = frame[col.source].copy()
                if col.fillOption == "Fill with Default Value" and col.defaultValue:
                    series = series.replace("", col.defaultValue)
                output[col.target] = series
    session.dataframe = output.fillna("")
    return {"message": "Columns arranged successfully", **sheet_summary(session.dataframe)}


@app.post("/api/empty-fields/detect")
def detect_empty_fields() -> dict[str, Any]:
    frame = require_data()
    fields = []
    for column in frame.columns:
        count = int(frame[column].astype(str).str.strip().eq("").sum())
        if count:
            fields.append({"column": column, "empty_cells": count, "completely_empty": count == len(frame)})
    return {"fields": fields, "total_empty_cells": sum(field["empty_cells"] for field in fields)}


@app.post("/api/empty-fields/apply")
def fill_empty_fields(request: EmptyFieldRequest) -> dict[str, Any]:
    frame = require_data().copy()
    if request.column not in frame.columns:
        raise HTTPException(400, "Please choose a valid field.")
    if not request.confirmed:
        raise HTTPException(400, "Please confirm before filling empty cells.")
    empty = frame[request.column].astype(str).str.strip().eq("")
    if request.value is not None:
        frame.loc[empty, request.column] = request.value
    session.dataframe = frame
    return {"message": "Empty field choice applied", "affected": int(empty.sum())}


@app.post("/api/validate")
def validate_data() -> dict[str, Any]:
    frame = require_data()
    empty_total = int(frame.eq("").sum().sum())
    sci_notation = len(number_errors(frame))
    return {
        "columns_kept": {"passed": len(frame.columns) > 0, "count": int(len(frame.columns))},
        "empty_cells": {"passed": empty_total == 0, "count": empty_total},
        "scientific_notation": {"passed": sci_notation == 0, "count": sci_notation},
        "rows": int(len(frame))
    }


@app.post("/api/preview")
def preview(limit: int = 100) -> dict[str, Any]:
    frame = require_data()
    return {"columns": list(frame.columns), "rows": frame.head(limit).to_dict("records"), "total_rows": int(len(frame))}


@app.post("/api/compare")
async def compare_excel_files(
    first: UploadFile = File(...),
    second: UploadFile = File(...),
    field: str = Form(...),
) -> dict[str, Any]:
    def read_uploaded(upload: UploadFile) -> pd.DataFrame:
        suffix = Path(upload.filename or "").suffix.lower()
        if suffix not in {".xlsx", ".xls", ".csv"}:
            raise HTTPException(400, "Both files must be Excel or CSV files.")
        if suffix == ".csv":
            return pd.read_csv(upload.file, dtype=str, keep_default_na=False).fillna("")
        return pd.read_excel(upload.file, dtype=str, keep_default_na=False).fillna("")
    first_frame, second_frame = read_uploaded(first), read_uploaded(second)
    if field not in first_frame.columns or field not in second_frame.columns:
        raise HTTPException(400, f"We couldn't find a shared {field} column. Choose a field available in both files.")
    first_keys = set(first_frame[field].astype(str).str.strip()) - {""}
    second_keys = set(second_frame[field].astype(str).str.strip()) - {""}
    common = first_keys & second_keys
    only_first, only_second = first_keys - second_keys, second_keys - first_keys

    first_common = first_frame[first_frame[field].isin(common)]
    second_common = second_frame[second_frame[field].isin(common)]
    merged_common = pd.merge(first_common, second_common, on=field, how='inner', suffixes=(' (First)', ' (Second)')).head(200).fillna("").to_dict("records")
    merged_overall = pd.merge(first_frame, second_frame, on=field, how='outer', suffixes=(' (First)', ' (Second)')).head(300).fillna("").to_dict("records")

    return {
        "field": field, 
        "counts": {
            "first": int(len(first_frame)), 
            "second": int(len(second_frame)), 
            "common": len(common), 
            "only_first": len(only_first), 
            "only_second": len(only_second),
            "overall": len(set(first_frame[field].astype(str).str.strip()) | set(second_frame[field].astype(str).str.strip()) - {""})
        }, 
        "common_records": merged_common, 
        "only_in_first": first_frame[first_frame[field].isin(only_first)].head(200).fillna("").to_dict("records"), 
        "only_in_second": second_frame[second_frame[field].isin(only_second)].head(200).fillna("").to_dict("records"),
        "overall_records": merged_overall
    }


@app.post("/api/compare/fields")
async def compare_fields(first: UploadFile = File(...), second: UploadFile = File(...)) -> dict[str, list[str]]:
    """Return columns shared by two workbooks before the user chooses a key."""
    def read_columns(upload: UploadFile) -> list[str]:
        suffix = Path(upload.filename or "").suffix.lower()
        if suffix not in {".xlsx", ".xls", ".csv"}:
            raise HTTPException(400, "Both files must be Excel or CSV files.")
        if suffix == ".csv":
            return list(pd.read_csv(upload.file, nrows=0).columns)
        return list(pd.read_excel(upload.file, nrows=0).columns)

    first_columns, second_columns = read_columns(first), read_columns(second)
    shared = [column for column in first_columns if column in second_columns]
    return {"shared_columns": shared, "first_columns": first_columns, "second_columns": second_columns}


@app.post("/api/export-csv")
def export_csv() -> StreamingResponse:
    frame = require_data()
    csv = frame.to_csv(index=False, encoding="utf-8-sig")
    return StreamingResponse(iter([csv.encode("utf-8-sig")]), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="Cleaned_Asset_Data.csv"'})


@app.post("/api/reset")
def reset() -> dict[str, str]:
    cleanup_temp_files()
    return {"message": "Temporary data cleared"}


def cleanup_temp_files() -> None:
    """Clear temporary workbook state without touching any user-owned file."""
    session.workbook_path = None
    session.workbook_name = None
    session.sheets = []
    session.active_sheet = None
    session.dataframe = pd.DataFrame()
    for child in TEMP_DIR.iterdir():
        if child.is_file():
            child.unlink(missing_ok=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
