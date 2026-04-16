import sharp from 'sharp';

async function generatePlayStoreIcon() {
  try {
    await sharp('assets/icon.png')
      .resize(512, 512)
      .toFile('play_store_icon_512.png');
    console.log('Generated play_store_icon_512.png successfully.');
  } catch (err) {
    console.error('Error generating Play Store icon:', err);
  }
}

generatePlayStoreIcon();
