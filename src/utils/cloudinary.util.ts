import { v2 as cloudinary } from 'cloudinary';

// Upload image or video to Cloudinary
export const uploadToCloudinary = (
  filePath: string,
  resourceType: 'image' | 'video' = 'image',
): Promise<{ public_id: string; secure_url: string }> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        resource_type: resourceType,
        folder: 'social_posts',
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Upload failed'));

        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
        });
      },
    );
  });
};

// Delete image or video from Cloudinary
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
