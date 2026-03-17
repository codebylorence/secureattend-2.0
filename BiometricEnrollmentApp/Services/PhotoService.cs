using System;
using System.IO;
using System.Windows.Media.Imaging;
using System.Drawing;
using System.Drawing.Imaging;

namespace BiometricEnrollmentApp.Services
{
    public class PhotoService
    {
        private readonly string _photosFolder;

        public PhotoService()
        {
            _photosFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Photos");
            EnsurePhotosFolderExists();
        }

        private void EnsurePhotosFolderExists()
        {
            if (!Directory.Exists(_photosFolder))
            {
                Directory.CreateDirectory(_photosFolder);
                LogHelper.Write($"📁 Created Photos folder at: {_photosFolder}");
            }
        }

        /// <summary>
        /// Save employee photo as compressed JPG file
        /// </summary>
        public bool SavePhoto(string employeeId, string sourceImagePath)
        {
            try
            {
                string targetPath = GetPhotoPath(employeeId);
                
                // Load and compress image to 200x200 thumbnail
                using (var originalImage = System.Drawing.Image.FromFile(sourceImagePath))
                {
                    using (var thumbnail = ResizeImage(originalImage, 200, 200))
                    {
                        // Save as JPG with 85% quality
                        var encoderParams = new EncoderParameters(1);
                        encoderParams.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 85L);
                        var jpegCodec = GetEncoder(ImageFormat.Jpeg);
                        
                        thumbnail.Save(targetPath, jpegCodec, encoderParams);
                    }
                }

                LogHelper.Write($"✅ Photo saved for {employeeId}: {targetPath}");
                return true;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Failed to save photo for {employeeId}: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Load employee photo as BitmapImage for WPF
        /// </summary>
        public BitmapImage? LoadPhoto(string employeeId)
        {
            try
            {
                string photoPath = GetPhotoPath(employeeId);
                
                if (!File.Exists(photoPath))
                {
                    return null;
                }

                var bitmap = new BitmapImage();
                bitmap.BeginInit();
                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                bitmap.UriSource = new Uri(photoPath, UriKind.Absolute);
                bitmap.EndInit();
                bitmap.Freeze(); // Make it thread-safe
                
                return bitmap;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Failed to load photo for {employeeId}: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Check if employee has a photo
        /// </summary>
        public bool HasPhoto(string employeeId)
        {
            return File.Exists(GetPhotoPath(employeeId));
        }

        /// <summary>
        /// Delete employee photo
        /// </summary>
        public bool DeletePhoto(string employeeId)
        {
            try
            {
                string photoPath = GetPhotoPath(employeeId);
                if (File.Exists(photoPath))
                {
                    File.Delete(photoPath);
                    LogHelper.Write($"🗑️ Deleted photo for {employeeId}");
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                LogHelper.Write($"❌ Failed to delete photo for {employeeId}: {ex.Message}");
                return false;
            }
        }

        private string GetPhotoPath(string employeeId)
        {
            return Path.Combine(_photosFolder, $"{employeeId}.jpg");
        }

        private Bitmap ResizeImage(System.Drawing.Image image, int width, int height)
        {
            var destRect = new Rectangle(0, 0, width, height);
            var destImage = new Bitmap(width, height);

            destImage.SetResolution(image.HorizontalResolution, image.VerticalResolution);

            using (var graphics = Graphics.FromImage(destImage))
            {
                graphics.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy;
                graphics.CompositingQuality = System.Drawing.Drawing2D.CompositingQuality.HighQuality;
                graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
                graphics.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;

                using (var wrapMode = new System.Drawing.Imaging.ImageAttributes())
                {
                    wrapMode.SetWrapMode(System.Drawing.Drawing2D.WrapMode.TileFlipXY);
                    graphics.DrawImage(image, destRect, 0, 0, image.Width, image.Height, GraphicsUnit.Pixel, wrapMode);
                }
            }

            return destImage;
        }

        private ImageCodecInfo GetEncoder(ImageFormat format)
        {
            ImageCodecInfo[] codecs = ImageCodecInfo.GetImageDecoders();
            foreach (ImageCodecInfo codec in codecs)
            {
                if (codec.FormatID == format.Guid)
                {
                    return codec;
                }
            }
            return null!;
        }
    }
}
