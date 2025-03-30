import { v2 as cloudinary } from 'cloudinary';

// Upload image to cloudinary
export const uploadToCloudinary = (
  filePath: string,
): Promise<{ public_id: string; secure_url: string }> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, (error, result) => {
      if (error) return reject(error);
      if (!result) return reject(new Error('Upload failed'));

      resolve({
        public_id: result.public_id,
        secure_url: result.secure_url,
      });
    });
  });
};

// Delete image from Cloudinary
export const deleteFromCloudinary = (
  publicId: string,
): Promise<{ result: string }> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      if (!result) return reject(new Error('Deletion failed'));

      resolve({ result });
    });
  });
};
