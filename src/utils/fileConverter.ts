import path from "path";
import { spawn } from "child_process";

/**
 * Utility class for converting multimedia files (images and videos)
 * Uses ffmpeg to convert files to standardized formats
 */
export class FileConverter {

    /**
     * Determines if a file should be converted based on its type and extension.
     *
     * @param {Express.Multer.File} file - The uploaded file to check.
     * @returns {boolean} True if the file needs conversion, false otherwise.
     */
    public static shouldConvert(file: Express.Multer.File): boolean {
      const ext = path.extname(file.originalname).toLowerCase();
      const mime = file.mimetype;
      const allowedExtensions = [".jpg", ".jpeg", ".png", ".mp4", ".mkv", ".mp3"];

      if (mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/") && !allowedExtensions.includes(ext)) {
        return true;
      } else {
        return false;
      }
    };


    /**
     * Checks if a file needs conversion and converts it if necessary
     * 
     * Images are converted to JPG if they are not already in JPG, JPEG, or PNG format
     * Videos are converted to MP4 if they are not already in MP4 or MKV format
     * 
     * @param file - The file uploaded via Multer to check and convert
     * @returns A promise that resolves with the path of the converted file (if conversion was needed) or undefined
     * @throws {Error} If the conversion fails
     */
    public static async convertIfNeeded(file: Express.Multer.File): Promise<string> {
        const ext = path.extname(file.originalname).toLowerCase();

        if (file.mimetype.startsWith("image/") && ![".jpg", ".jpeg", ".png"].includes(ext)) {
           return await this.convertimage(file, ext);
        } else if (file.mimetype.startsWith("video/") && ![".mp4", ".mkv"].includes(ext)) {
            return await this.convertVideo(file, ext);
        }

        return file.path;
    };


    /**
     * Converts a video file to MP4 format
     * 
     * @param file - The video file to convert
     * @param ext - The original file extension (e.g., ".avi", ".mov")
     * @returns A promise that resolves with the path of the converted file
     * @throws {Error} If the conversion fails (ffmpeg error)
     */
    public static async convertVideo(file: Express.Multer.File, ext: string): Promise<string> {
        const convertedName = `${Date.now()}_${path.basename(file.originalname, ext)}.mp4`;
        const convertedPath = path.join("tmpFile", convertedName);

        await this.FfmpegConversion(file.path, convertedPath);

        return convertedPath;
    };

    /**
     * Converts an image file to JPG format
     * 
     * @param file - The image file to convert
     * @param ext - The original file extension (e.g., ".gif", ".bmp", ".webp")
     * @returns A promise that resolves with the path of the converted file
     * @throws {Error} If the conversion fails (ffmpeg error)
     */
    public static async convertimage(file: Express.Multer.File, ext: string) {
        const convertedName = `${Date.now()}_${path.basename(file.originalname, ext)}.jpg`;
        const convertedPath = path.join("tmpFile", convertedName);

        await this.FfmpegConversion(file.path, convertedPath);

        return convertedPath;
    };


    /**
     * Performs the actual file conversion using ffmpeg
     * 
     * Uses libx264 codec for video and aac codec for audio
     * The output file will overwrite any existing file at the output path (-y flag)
     * 
     * @param inputPath - The path to the input file to convert
     * @param outputPath - The path where the converted file will be saved
     * @returns A promise that resolves when the conversion is complete
     * @throws {Error} If ffmpeg process fails or exits with a non-zero code
     */
    private static async FfmpegConversion(inputPath: string, outputPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn("ffmpeg", [
               "-y",
               "-i", inputPath,
               "-c:v", "libx264",
               "-c:a", "aac",
               outputPath, 
            ]);
        
            ffmpeg.stderr.on("data", (data) => {
                console.log(`[ffmpeg] : ${data}`);
            });

            ffmpeg.on("error", (err) => reject(err));
            
            ffmpeg.on("close", (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`ffmpeg process exited with code ${code}`));
                }
            });
        });
    };
}