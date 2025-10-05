import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { ReportItemDialog } from "@/components/ReportItemDialog";
import { ItemDetailDialog } from "@/components/ItemDetailDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PackagePlus, PackageSearch, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Item {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  contact_info: string;
  image_url: string | null;
  type: "lost" | "found";
  created_at: string;
}

const CATEGORIES = [
  "All Categories",
  "Electronics",
  "Books & Stationery",
  "Clothing & Accessories",
  "ID Cards & Documents",
  "Keys",
  "Bags & Backpacks",
  "Sports Equipment",
  "Other",
];

const Index = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<"lost" | "found">("lost");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "lost" | "found">("all");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
    fetchItems();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [items, filterType, filterCategory]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data || []) as Item[]);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to load items");
    }
  };

  const applyFilters = () => {
    let filtered = items;

    if (filterType !== "all") {
      filtered = filtered.filter((item) => item.type === filterType);
    }

    if (filterCategory !== "All Categories") {
      filtered = filtered.filter((item) => item.category === filterCategory);
    }

    setFilteredItems(filtered);
  };

  const handleReportClick = (type: "lost" | "found") => {
    if (!user) {
      toast.error("Please sign in to report items");
      navigate("/auth");
      return;
    }
    setReportType(type);
    setIsReportDialogOpen(true);
  };

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-secondary/5 to-background py-16 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Lost & Found Campus Helper
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Help your fellow students find their lost items or return found belongings
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gap-2 bg-gradient-to-r from-secondary to-secondary/90 hover:from-secondary/90 hover:to-secondary"
              onClick={() => handleReportClick("lost")}
            >
              <PackageSearch className="h-5 w-5" />
              Report Lost Item
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleReportClick("found")}
            >
              <PackagePlus className="h-5 w-5" />
              Report Found Item
            </Button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Browse Items</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="lost">Lost Items</SelectItem>
                <SelectItem value="found">Found Items</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items found. Be the first to report one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                {...item}
                imageUrl={item.image_url || undefined}
                location={item.location || undefined}
                description={item.description || undefined}
                createdAt={item.created_at}
                onContactClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        )}
      </section>

      <ReportItemDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        type={reportType}
        onSuccess={fetchItems}
      />

      <ItemDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        item={selectedItem ? {
          ...selectedItem,
          imageUrl: selectedItem.image_url || undefined,
          location: selectedItem.location || undefined,
          description: selectedItem.description || undefined,
          contactInfo: selectedItem.contact_info,
          createdAt: selectedItem.created_at,
        } : null}
      />
    </div>
  );
};

export default Index;
