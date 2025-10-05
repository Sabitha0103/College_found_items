-- Create items table for lost and found items
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  location TEXT,
  contact_info TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Create policies for items
CREATE POLICY "Anyone can view active items" 
ON public.items 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Users can create their own items" 
ON public.items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" 
ON public.items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" 
ON public.items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for item images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('item-images', 'item-images', true);

-- Create storage policies
CREATE POLICY "Anyone can view item images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'item-images');

CREATE POLICY "Authenticated users can upload item images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'item-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);