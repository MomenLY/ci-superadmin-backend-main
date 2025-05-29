import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ExcelData } from './excel-data.interface';
import { generateExcel } from 'src/utils/helper';

@Injectable()
export class ExcelService {
  // Method to generate Excel file
  async createExcelFile(excelData: ExcelData): Promise<Buffer> {
    return generateExcel(excelData);
  }
}
