import { Link } from "react-router-dom";
import './Home.css';

export const Home = () => {
  const games = [
    {
      id: 'symbiomes',
      title: 'Symbiomes',
      subtitle: 'Solve the ecosystem puzzle',
      path: '/symbiomes',
      image: `${import.meta.env.BASE_URL}assets/symbiomes/symbiomes-main.jpg`
    },
    {
      id: 'neon-protocol',
      title: 'Neon Protocol',
      subtitle: 'Hack the cyber grid',
      path: '/neon-protocol',
      image: `${import.meta.env.BASE_URL}assets/neon-protocol/neon-protocol-main.jpg`
    },
    {
      id: 'logic-gems',
      title: 'Logic Gems',
      subtitle: 'Uncover hidden patterns',
      path: '/logic-gems',
      image: `${import.meta.env.BASE_URL}assets/logic-gems/logic-gems-main.jpg`
    },
    {
      id: 'wild-lies',
      title: 'Wild Lies',
      subtitle: 'Find the Culprits and Liars',
      path: '/wild-lies',
      image: `${import.meta.env.BASE_URL}assets/wild-lies/wild-lies-main.jpg`
    }
  ];

  return (
    <div className="home-container">
      <header className="home-header">
        <h1 className="main-title">Daily Logic Puzzles</h1>
        <p className="main-subtitle">Select a challenge to begin with</p>
      </header>

      <div className="games-grid">
        {games.map((game) => (
          <div key={game.id} className="game-card">
            <Link 
              to={game.path} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="game-link"
            >
              <div className="image-wrapper">
                <img src={game.image} alt={game.title} className="game-image" />
              </div>
              <div className="game-info">
                <h2 className="game-title">{game.title}</h2>
                <p className="game-subtitle">{game.subtitle}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};