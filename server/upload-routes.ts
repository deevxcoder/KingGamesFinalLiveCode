import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { UserRole } from '@shared/schema';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const proofUploadsDir = path.join(uploadsDir, 'proofs');
const sliderUploadsDir = path.join(uploadsDir, 'sliders');
const gameCardUploadsDir = path.join(uploadsDir, 'gamecards');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(proofUploadsDir)) {
  fs.mkdirSync(proofUploadsDir, { recursive: true });
}

if (!fs.existsSync(sliderUploadsDir)) {
  fs.mkdirSync(sliderUploadsDir, { recursive: true });
}

if (!fs.existsSync(gameCardUploadsDir)) {
  fs.mkdirSync(gameCardUploadsDir, { recursive: true });
}

// File filter to accept only images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Configure proof uploads storage
const proofStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, proofUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `proof-${uniqueSuffix}${ext}`);
  }
});

// Configure slider uploads storage
const sliderStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, sliderUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `slider-${uniqueSuffix}${ext}`);
  }
});

// Configure game card uploads storage
const gameCardStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, gameCardUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `gamecard-${uniqueSuffix}${ext}`);
  }
});

// Create multer instances for different upload types
const proofUpload = multer({ 
  storage: proofStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: fileFilter
});

const sliderUpload = multer({ 
  storage: sliderStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max file size
  },
  fileFilter: fileFilter
});

const gameCardUpload = multer({ 
  storage: gameCardStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max file size
  },
  fileFilter: fileFilter
});

export function setupUploadRoutes(app: express.Express) {
  // Handle authentication middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  };
  
  // Handle admin role check middleware
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user || (req.user as any).role !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }
    next();
  };

  // API route to upload proof images
  app.post('/api/upload/proof', requireAuth, proofUpload.single('proofImage'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Generate URL for the uploaded file
      const fileUrl = `/uploads/proofs/${req.file.filename}`;
      
      // Return the URL to the client
      res.json({ 
        success: true, 
        imageUrl: fileUrl 
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'File upload failed' });
    }
  });
  
  // API route to upload slider images (admin only)
  app.post('/api/upload/slider', requireAdmin, sliderUpload.single('sliderImage'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Generate URL for the uploaded file
      const fileUrl = `/uploads/sliders/${req.file.filename}`;
      
      // Return the URL to the client
      res.json({ 
        success: true, 
        imageUrl: fileUrl 
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'File upload failed' });
    }
  });
  
  // API route to get all slider images
  app.get('/api/sliders', async (req: Request, res: Response) => {
    try {
      // Read the sliders directory
      const files = fs.readdirSync(sliderUploadsDir);
      
      // Map to URLs
      const sliderImages = files.map(file => ({
        filename: file,
        url: `/uploads/sliders/${file}`
      }));
      
      res.json(sliderImages);
    } catch (error) {
      console.error('Error fetching slider images:', error);
      res.status(500).json({ error: 'Failed to fetch slider images' });
    }
  });
  
  // API route to delete a slider image (admin only)
  app.delete('/api/sliders/:filename', requireAdmin, (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(sliderUploadsDir, filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Image not found' });
      }
      
      // Delete the file
      fs.unlinkSync(filePath);
      
      res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
      console.error('Error deleting slider image:', error);
      res.status(500).json({ error: 'Failed to delete slider image' });
    }
  });
  
  // API route to upload game card images (admin only)
  app.post('/api/upload/gamecard', requireAdmin, gameCardUpload.single('gameCardImage'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Get game type from request body (market, cricket, sports, coinflip)
      const { gameType } = req.body;
      
      if (!gameType) {
        return res.status(400).json({ error: 'Game type is required' });
      }

      // Create a new filename that includes the game type for better organization
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(req.file.originalname);
      const newFilename = `gamecard-${gameType}-${uniqueSuffix}${ext}`;
      
      // Create the new file path 
      const oldPath = path.join(gameCardUploadsDir, req.file.filename);
      const newPath = path.join(gameCardUploadsDir, newFilename);
      
      // Rename the file to include the game type
      fs.renameSync(oldPath, newPath);
      
      // Generate URL for the uploaded file
      const fileUrl = `/uploads/gamecards/${newFilename}`;
      
      // Return the URL to the client
      res.json({ 
        success: true, 
        imageUrl: fileUrl,
        gameType: gameType,
        filename: newFilename
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'File upload failed' });
    }
  });
  
  // API route to get all game card images, optionally filtered by game type
  app.get('/api/gamecards', async (req: Request, res: Response) => {
    try {
      const gameType = req.query.gameType as string | undefined;
      
      // Read the game cards directory
      const files = fs.readdirSync(gameCardUploadsDir);
      
      // Filter by game type if provided
      const filteredFiles = gameType 
        ? files.filter(file => file.includes(`gamecard-${gameType}-`))
        : files;
      
      // Map to URLs
      const gameCardImages = filteredFiles.map(file => {
        // Extract game type from filename
        const typeMatch = file.match(/gamecard-([\w-]+)-\d+/);
        const extractedType = typeMatch ? typeMatch[1] : 'unknown';
        
        return {
          filename: file,
          url: `/uploads/gamecards/${file}`,
          gameType: extractedType
        };
      });
      
      res.json(gameCardImages);
    } catch (error) {
      console.error('Error fetching game card images:', error);
      res.status(500).json({ error: 'Failed to fetch game card images' });
    }
  });
  
  // API route to delete a game card image (admin only)
  app.delete('/api/gamecards/:filename', requireAdmin, (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(gameCardUploadsDir, filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Image not found' });
      }
      
      // Delete the file
      fs.unlinkSync(filePath);
      
      res.json({ success: true, message: 'Game card image deleted successfully' });
    } catch (error) {
      console.error('Error deleting game card image:', error);
      res.status(500).json({ error: 'Failed to delete game card image' });
    }
  });

  // Allow access to static uploads
  app.use('/uploads', express.static(uploadsDir));
}