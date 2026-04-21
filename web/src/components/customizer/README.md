# Bag Customizer Components

A complete 3D bag customization system for riben.life using Three.js and React Three Fiber.

## Components

### Bag3DCanvas

Interactive 3D preview of the customized bag using Three.js.

```tsx
import { Bag3DCanvas } from "@/components/customizer/bag-3d-canvas"

<Bag3DCanvas customization={customization} />
```

**Features:**

- Auto-rotating camera with manual controls
- Proper lighting and material shading
- Pattern preview with initials overlay
- Real-time updates as customization changes

### BagTexturedGltfModel

Loads `public/models/{glbKey}.glb` **as exported** (materials unchanged; default demo: `bag-textured.glb`). Optional front decal (uploaded image + monogram) uses mesh names per `doc/GUIDE-meshy-bag-glb-naming.md`. Used internally by `Bag3DCanvas` only.

### CustomizerControls

Full UI panel for all customization options organized in tabs.

```tsx
import { CustomizerControls } from "@/components/customizer/customizer-controls"

<CustomizerControls
  customization={customization}
  onChange={(newCustomization) => setCustomization(newCustomization)}
/>
```

**Tabs:**

1. **Monogram** - Initials, font size, text color
2. **Front photo** - Optional image upload for the front panel

### CustomizationPreview

Compact or full preview card showing the customized design.

```tsx
// Compact version for cart items
<CustomizationPreview customization={customization} compact />

// Full version for detail pages
<CustomizationPreview customization={customization} />
```

## Types & Constants

See `src/types/customizer.ts` for:

- `BagCustomization` interface
- `DEFAULT_CUSTOMIZATION` preset
- Color, size, and material presets

## Utilities

### `src/lib/customization-utils.ts`

- `serializeCustomization()` - Convert to JSON
- `deserializeCustomization()` - Parse from JSON
- `validateCustomization()` - Type validation
- `getCustomizationSummary()` - Human-readable summary
- `estimateCustomizationPrice()` - Calculate final price with surcharges

### `src/hooks/use-bag-customization.ts`

React hook for managing customization state:

```tsx
const {
  customization,
  updateCustomization,
  resetCustomization,
  loadFromJson,
  toJson,
} = useBagCustomization()
```

## Pages

### `/shop/p/[productId]/customizer`

Canonical customization route for a specific product (requires `public/models/{glbKey}.glb`). Legacy `/shop/customized/[productId]` redirects here.

**Features:**

- 3D preview with auto-rotate
- All customization controls
- Live price calculation with surcharges
- Quantity selector
- Add to cart functionality
- Design summary display
- Material information section

## Database Schema

OrderItem model updated with:

```prisma
customizationData String? // JSON string storing customization details
```

This stores the complete customization configuration serialized as JSON.

## Server Actions

### `addCustomizedProductToCart`

Add a customized product to cart with full customization data.

```typescript
const result = await addCustomizedProductToCart({
  productId: "uuid",
  customization: customizationObject,
  quantity: 1,
})
```

## Usage Example

```tsx
"use client"

import { useState } from "react"
import { Bag3DCanvas } from "@/components/customizer/bag-3d-canvas"
import { CustomizerControls } from "@/components/customizer/customizer-controls"
import { BagCustomization, DEFAULT_CUSTOMIZATION } from "@/types/customizer"

export function MyCustomizer() {
  const [customization, setCustomization] = useState<BagCustomization>(
    DEFAULT_CUSTOMIZATION
  )

  return (
    <div className="flex gap-8">
      <div className="flex-1 h-96">
        <Bag3DCanvas customization={customization} />
      </div>
      <div className="flex-1">
        <CustomizerControls
          customization={customization}
          onChange={setCustomization}
        />
      </div>
    </div>
  )
}
```

## Customization Data Structure

```typescript
interface BagCustomization {
  // Color/Material
  color: string                 // hex color code
  material: "canvas" | "leather" | "nylon"

  // Initials/Monogramming
  initials: string              // max 4 characters
  initialsFontSize: number      // 12-72px
  initialsColor: string         // hex color code

  // Pattern
  patternScale: number          // 0.5-2x
  patternRotation: number       // 0-360°
  patternOpacity: number        // 0-1

  // Size
  width: number                 // cm, 25-50
  height: number                // cm, 20-40
  depth: number                 // cm, 10-25
}
```

## Pricing Logic

Base price + surcharges for:

- **Material**: Leather +30%, Nylon +10%, Canvas baseline
- **Size**: Extra cost for larger dimensions
- **Personalization**: +$15 flat fee for initials

## Future Enhancements

- [ ] Save designs for later
- [ ] Share design links with custom preview
- [ ] Design templates/presets
- [ ] Pattern library with more designs
- [ ] Monogram style options
- [ ] Compare designs side-by-side
- [ ] Design history/favorites
- [ ] Print/export design
