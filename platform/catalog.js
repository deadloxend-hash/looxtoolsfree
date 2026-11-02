export const aiTools=[
 ['ai-chat','LOOX AI Chat','Utilities','Chat with your creative AI assistant.','chat','✦'],
 ['bg-remove','Background Remover','Editing','Create a transparent PNG.','background','✂'],
 ['ai-image-upscaler','Image Upscaler','Enhancement','Enlarge images 2× or 4×.','upscale2','↗'],
 ['ai-image-enhancer','Image Enhancer','Enhancement','Enhance details with a 2× AI upscale.','enhance','✧'],
 ['ai-object-eraser','Object Eraser','Editing','Paint over an unwanted object.','erase','◌'],
 ['ai-watermark-remover','Watermark Remover','Editing','Edit marks on media you have permission to use.','erase','◇'],
 ['ai-text-to-image','Image Generator','Generation','Turn a prompt into a private PNG.','generate','✦'],
 ['ai-generative-fill','Generative Fill','Generation','Paint a region and describe its replacement.','fill','▧'],
 ['ai-generative-erase','Generative Erase','Editing','Remove selected content with a mask.','erase','⊖'],
 ['ai-uncrop','Generative Uncrop','Generation','Expand the image beyond its borders.','uncrop','⊞'],
 ['ai-photo-restorer','Old Photo Restorer','Restoration','Repair damaged and faded photographs.','restore','◷'],
 ['ai-skin-retoucher','Skin Retoucher','Enhancement','Natural portrait enhancement.','retouch','◉'],
 ['ai-face-restoration','Face Restoration','Restoration','Restore blurry facial details.','face_restore','◎'],
 ['image-to-text','Image to Text / OCR','Utilities','Extract printed English text on your device.','local','Aa'],
 ['face-blur','Automatic Face Blur','Privacy','Detect and blur faces on your device.','local','▦'],
 ['faceswap','Face Swap','Editing','Consent-based face editing.','face_swap','⇄']
].map(([slug,name,category,description,operation,icon])=>({slug,name,category,description,operation,icon}));
