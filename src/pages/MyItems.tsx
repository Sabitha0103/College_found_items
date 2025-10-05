import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, MapPin } from "lucide-react";
import { format } from "date-fns";

interface Item {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  image_url: string | null;
  type: "lost" | "found";
  created_at: string;
  status: string;
}

const MyItems = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyItems();
  }, []);

  const fetchMyItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data || []) as Item[]);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to load your items");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Item deleted successfully");
      fetchMyItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  const handleMarkResolved = async (id: string) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ status: 'resolved' })
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Item marked as resolved!");
      fetchMyItems();
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Items</h1>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your items...</p>
          </div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">You haven't reported any items yet</p>
            <Button onClick={() => window.location.href = "/"}>
              Report an Item
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <Card key={item.id} className="p-4 flex gap-4">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge
                          className={
                            item.type === "lost"
                              ? "bg-secondary"
                              : "bg-accent"
                          }
                        >
                          {item.type}
                        </Badge>
                        <Badge variant="outline">{item.category}</Badge>
                        {item.status === 'resolved' && (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Resolved
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {item.description}
                    </p>
                  )}
                  
                  {item.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      {item.location}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.created_at), "MMM d, yyyy")}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {item.status === 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkResolved(item.id)}
                    >
                      Mark Resolved
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyItems;
