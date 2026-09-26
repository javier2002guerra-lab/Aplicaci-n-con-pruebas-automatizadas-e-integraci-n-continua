CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  sku VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL,
  reorder_level INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT products_sku_format CHECK (sku ~ '^[A-Z0-9][A-Z0-9-]{2,19}$'),
  CONSTRAINT products_name_length CHECK (char_length(trim(name)) BETWEEN 2 AND 100),
  CONSTRAINT products_quantity_nonnegative CHECK (quantity >= 0),
  CONSTRAINT products_reorder_level_range CHECK (reorder_level BETWEEN 0 AND 10000)
);

CREATE INDEX products_created_at_idx ON products (created_at, id);
