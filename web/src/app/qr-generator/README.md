# QR Code Generator

A free online QR code generator with advanced customization options for creating URL-based QR codes.

## Features

### Content Types

- ✅ **URL** - Create QR codes for web links (MVP implementation)
- 🔜 Bank Transfer (TWQR)
- 🔜 Map Coordinates
- 🔜 vCard (Contact)
- 🔜 Calendar Events
- 🔜 WiFi Connection
- 🔜 Cryptocurrency
- 🔜 SMS & Phone

### Customization Options

- **Size**: Adjustable from 100px to 800px
- **Colors**: Custom foreground and background colors
- **Transparency**: Optional transparent background
- **Error Correction**: 4 levels (L, M, Q, H) from 7% to 30% recovery
- **Border**: Adjustable margin from 0 to 10 modules
- **Corner Squares**: Customize outer and inner corner patterns
  - Outer frame styles: Default, Square, Rounded, Dot
  - Inner frame styles: Default, Square, Rounded, Dot
  - Independent color customization for each

### Download

- **Format**: PNG with transparency support
- **Custom Filename**: Choose your own filename
- **One-Click Download**: Simple download process

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **QR Library**: `qr-code-styling` v1.9.2 (advanced customization support)
- **UI Components**: Shadcn/ui + Tailwind CSS
- **Icons**: Tabler Icons React

## File Structure

```
src/app/qr-generator/
├── page.tsx                          # Server component (main page)
├── README.md                         # This file
└── components/
    ├── qr-generator-client.tsx      # Main client component
    ├── url-input.tsx                # URL input with validation
    ├── qr-preview.tsx               # Real-time QR preview
    ├── qr-settings.tsx              # QR code customization settings
    ├── qr-corner-square-settings.tsx   # QR corner square customization
    └── download-button.tsx          # Download dialog

src/lib/qr/
├── types.ts                         # TypeScript type definitions
└── generator.ts                     # QR generation logic
```

## Usage

### Basic Usage

1. Navigate to `/qr-generator`
2. Enter a URL in the input field
3. Customize colors, size, and settings
4. Preview updates in real-time
5. Click "Download QR Code" to save

### URL Validation

- URLs must start with `http://` or `https://`
- If you enter a URL without protocol, the app will auto-add `https://`
- Valid URLs show a green checkmark
- Invalid URLs show an error message

### Error Correction Levels

| Level | Recovery | Use Case |
|-------|----------|----------|
| L | 7% | Clean, simple QR codes |
| M | 15% | General purpose (default) |
| Q | 25% | Logos or styling |
| H | 30% | Heavy customization |

## Development

### Adding New Content Types

1. Add content type to `src/lib/qr/types.ts`
2. Create encoder function in `src/lib/qr/generator.ts`
3. Create input component in `components/`
4. Update main client component to support new type

### Example: Adding Phone Number Support

```typescript
// 1. Add to types.ts
export type ContentType = 'url' | 'tel' | ...;

// 2. Add encoder to generator.ts
export function encodePhone(phoneNumber: string): string {
  return `tel:${phoneNumber}`;
}

// 3. Create components/phone-input.tsx
export function PhoneInput({ value, onChange }) {
  // Implementation
}

// 4. Update qr-generator-client.tsx
// Add phone input and state management
```

## Future Enhancements

- [ ] Additional content types (see spec)
- [ ] Dot style customization (rounded, dots)
- [x] Corner square styling ✅
- [ ] Logo embedding (text & image)
- [ ] Multiple export formats (JPEG, WEBP, SVG)
- [ ] Camera QR scanner
- [ ] History & templates
- [ ] Multi-language support
- [ ] Dark mode support

## References

- [QR Code Specification (qr.ioi.tw)](https://qr.ioi.tw/zh/)
- [Full Specification Document](../../../doc/QR_CODE_GENERATOR_SPEC.md)
- [QRCode Library Documentation](https://www.npmjs.com/package/qrcode)

## License

This feature is part of the mingster.com project and follows the project's license terms.

QR Code is a registered trademark of DENSO WAVE. The technology is patent-free and can be used without licensing fees.
