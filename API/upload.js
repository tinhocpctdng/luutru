import { google } from 'googleapis';
import busboy from 'busboy';
import { Readable } from 'stream';

export const config = {
  api: {
    bodyParser: false, // Tắt parser mặc định để nhận file stream lớn
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });
    const bb = busboy({ headers: req.headers });

    let fileBuffer = [];
    let fileName = '';
    let mimeType = '';
    let fields = {};

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('file', (name, file, info) => {
      fileName = info.filename;
      mimeType = info.mimeType;
      file.on('data', (data) => fileBuffer.push(data));
    });

    bb.on('finish', async () => {
      try {
        const buffer = Buffer.concat(fileBuffer);
        const stream = Readable.from(buffer);

        // Đẩy file lên Google Drive
        const response = await drive.files.create({
          requestBody: {
            name: `${fields.teacher_name || 'GV'}_Tuan${fields.week || 'X'}_${fileName}`,
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
          },
          media: {
            mimeType: mimeType,
            body: stream,
          },
          fields: 'id, webViewLink, webContentLink',
        });

        const fileId = response.data.id;

        // Cấp quyền xem cho bất kỳ ai có link (để Tổ trưởng/BGH bấm vào xem được ngay)
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });

        return res.status(200).json({
          success: true,
          fileUrl: response.data.webViewLink,
          fileId: fileId,
        });
      } catch (uploadErr) {
        return res.status(500).json({ error: 'Upload Google Drive failed: ' + uploadErr.message });
      }
    });

    req.pipe(bb);
  } catch (err) {
    return res.status(500).json({ error: 'Auth failed: ' + err.message });
  }
}